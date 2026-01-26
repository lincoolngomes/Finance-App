import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KiwifyWebhookPayload {
  event: string // 'purchase.approved', 'purchase.refunded', 'subscription.cancelled', etc
  transaction_id: string
  order_id?: string
  product_id: string
  product_name?: string
  customer: {
    email: string
    name?: string
    phone?: string
  }
  purchase: {
    amount: number
    currency: string
    status: string // 'paid', 'refunded', 'cancelled'
    payment_method?: string
    paid_at?: string
  }
  subscription?: {
    id: string
    plan: string
    status: string
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Inicializar Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse do payload do Kiwify
    const payload: KiwifyWebhookPayload = await req.json()
    console.log('📦 Webhook recebido do Kiwify:', payload.event, payload.transaction_id)

    // Validar se é um evento relevante
    if (!['purchase.approved', 'purchase.refunded', 'subscription.cancelled'].includes(payload.event)) {
      console.log('⚠️ Evento ignorado:', payload.event)
      return new Response(
        JSON.stringify({ success: true, message: 'Evento ignorado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. REGISTRAR TRANSAÇÃO
    const { data: transaction, error: transactionError } = await supabase
      .from('kiwify_transactions')
      .insert({
        transaction_id: payload.transaction_id,
        order_id: payload.order_id,
        product_id: payload.product_id,
        product_name: payload.product_name,
        customer_email: payload.customer.email,
        customer_name: payload.customer.name,
        customer_phone: payload.customer.phone,
        amount: payload.purchase.amount,
        currency: payload.purchase.currency,
        status: payload.purchase.status,
        payment_method: payload.purchase.payment_method,
        paid_at: payload.purchase.paid_at,
        webhook_payload: payload,
      })
      .select()
      .single()

    if (transactionError && transactionError.code !== '23505') { // Ignora duplicata
      console.error('❌ Erro ao registrar transação:', transactionError)
      throw transactionError
    }

    console.log('✅ Transação registrada:', transaction?.id || 'duplicada')

    // 2. PROCESSAR EVENTOS
    if (payload.event === 'purchase.approved') {
      await handlePurchaseApproved(supabase, payload, transaction?.id)
    } else if (payload.event === 'purchase.refunded') {
      await handlePurchaseRefunded(supabase, payload)
    } else if (payload.event === 'subscription.cancelled') {
      await handleSubscriptionCancelled(supabase, payload)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================
// HANDLERS DE EVENTOS
// ============================================

async function handlePurchaseApproved(supabase: any, payload: KiwifyWebhookPayload, transactionId?: string) {
  console.log('💰 Processando compra aprovada...')

  // 1. Verificar se usuário já existe pelo email
  const { data: existingUser } = await supabase.auth.admin.listUsers()
  const user = existingUser?.users?.find((u: any) => u.email === payload.customer.email)

  let userId: string

  if (user) {
    console.log('👤 Usuário existente encontrado:', user.id)
    userId = user.id
  } else {
    // 2. Criar novo usuário
    console.log('👤 Criando novo usuário...')
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: payload.customer.email,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        name: payload.customer.name || payload.customer.email.split('@')[0],
        phone: payload.customer.phone,
        created_by: 'kiwify',
      }
    })

    if (userError) {
      console.error('❌ Erro ao criar usuário:', userError)
      throw userError
    }

    userId = newUser.user.id
    console.log('✅ Usuário criado:', userId)
  }

  // 3. Determinar tipo de plano e duração
  const planType = determinePlanType(payload.product_id, payload.product_name)
  const endDate = calculateEndDate(planType)

  // 4. Criar ou atualizar assinatura
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_type: planType,
      status: 'active',
      kiwify_transaction_id: payload.transaction_id,
      kiwify_subscription_id: payload.subscription?.id,
      kiwify_product_id: payload.product_id,
      kiwify_customer_email: payload.customer.email,
      start_date: new Date().toISOString(),
      end_date: endDate,
      created_by: 'kiwify',
      metadata: {
        product_name: payload.product_name,
        amount_paid: payload.purchase.amount,
        payment_method: payload.purchase.payment_method,
      }
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single()

  if (subscriptionError) {
    console.error('❌ Erro ao criar assinatura:', subscriptionError)
    throw subscriptionError
  }

  // 5. Atualizar transação com subscription_id
  if (transactionId) {
    await supabase
      .from('kiwify_transactions')
      .update({ subscription_id: subscription.id })
      .eq('id', transactionId)
  }

  console.log('✅ Assinatura criada/atualizada:', subscription.id)

  // 6. TODO: Enviar email de boas-vindas
  // await sendWelcomeEmail(payload.customer.email, planType)
}

async function handlePurchaseRefunded(supabase: any, payload: KiwifyWebhookPayload) {
  console.log('💸 Processando reembolso...')

  // Cancelar assinatura
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('kiwify_transaction_id', payload.transaction_id)

  if (error) {
    console.error('❌ Erro ao cancelar assinatura:', error)
    throw error
  }

  console.log('✅ Assinatura cancelada por reembolso')
}

async function handleSubscriptionCancelled(supabase: any, payload: KiwifyWebhookPayload) {
  console.log('🚫 Processando cancelamento...')

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('kiwify_subscription_id', payload.subscription?.id)

  if (error) {
    console.error('❌ Erro ao cancelar assinatura:', error)
    throw error
  }

  console.log('✅ Assinatura cancelada')
}

// ============================================
// HELPERS
// ============================================

function determinePlanType(productId: string, productName?: string): string {
  // Adapte conforme seus produtos no Kiwify
  const name = productName?.toLowerCase() || ''
  
  if (name.includes('vitalíc') || name.includes('lifetime')) {
    return 'lifetime'
  } else if (name.includes('anual') || name.includes('yearly')) {
    return 'yearly'
  } else if (name.includes('mensal') || name.includes('monthly')) {
    return 'monthly'
  } else {
    return 'monthly' // Default
  }
}

function calculateEndDate(planType: string): string | null {
  if (planType === 'lifetime') {
    return null // Sem expiração
  }
  
  const now = new Date()
  
  if (planType === 'yearly') {
    now.setFullYear(now.getFullYear() + 1)
  } else if (planType === 'monthly') {
    now.setMonth(now.getMonth() + 1)
  }
  
  return now.toISOString()
}
