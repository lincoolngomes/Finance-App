import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Access Token do Mercado Pago (configure nas variáveis de ambiente)
const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Mercado Pago envia notificações em formato específico
    const notification = await req.json()
    
    console.log('📦 Notificação recebida do Mercado Pago:', notification)

    // Validar tipo de notificação
    if (notification.type !== 'payment') {
      console.log('⚠️ Tipo de notificação ignorado:', notification.type)
      return new Response(
        JSON.stringify({ success: true, message: 'Tipo ignorado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar detalhes do pagamento na API do Mercado Pago
    const paymentId = notification.data.id
    const paymentDetails = await fetchPaymentDetails(paymentId)

    if (!paymentDetails) {
      throw new Error('Não foi possível obter detalhes do pagamento')
    }

    console.log('💳 Detalhes do pagamento:', paymentDetails.status, paymentDetails.transaction_amount)

    // Registrar transação
    await registerTransaction(supabase, paymentDetails)

    // Processar baseado no status
    if (paymentDetails.status === 'approved') {
      await handleApprovedPayment(supabase, paymentDetails)
    } else if (paymentDetails.status === 'refunded') {
      await handleRefundedPayment(supabase, paymentDetails)
    }

    return new Response(
      JSON.stringify({ success: true }),
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
// FUNÇÕES AUXILIARES
// ============================================

async function fetchPaymentDetails(paymentId: string) {
  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        }
      }
    )

    if (!response.ok) {
      throw new Error(`MP API retornou ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Erro ao buscar detalhes do pagamento:', error)
    return null
  }
}

async function registerTransaction(supabase: any, payment: any) {
  const { error } = await supabase
    .from('mercadopago_transactions')
    .insert({
      payment_id: String(payment.id),
      preference_id: payment.preference_id,
      merchant_order_id: payment.order?.id ? String(payment.order.id) : null,
      payer_email: payment.payer.email,
      payer_name: payment.payer.first_name + ' ' + (payment.payer.last_name || ''),
      payer_id: String(payment.payer.id),
      amount: payment.transaction_amount,
      currency: payment.currency_id,
      status: payment.status,
      status_detail: payment.status_detail,
      payment_method: payment.payment_method_id,
      payment_type: payment.payment_type_id,
      plan_type: payment.metadata?.plan_type,
      description: payment.description,
      approved_at: payment.status === 'approved' ? payment.date_approved : null,
      webhook_payload: payment,
      metadata: payment.metadata || {}
    })

  if (error && error.code !== '23505') { // Ignora duplicata
    console.error('❌ Erro ao registrar transação:', error)
    throw error
  }

  console.log('✅ Transação registrada:', payment.id)
}

async function handleApprovedPayment(supabase: any, payment: any) {
  console.log('💰 Processando pagamento aprovado...')

  const email = payment.payer.email
  const planType = payment.metadata?.plan_type || 'monthly'

  // 1. Verificar se usuário existe
  const { data: existingUser } = await supabase.auth.admin.listUsers()
  const user = existingUser?.users?.find((u: any) => u.email === email)

  let userId: string

  if (user) {
    console.log('👤 Usuário existente:', user.id)
    userId = user.id
  } else {
    // 2. Criar novo usuário
    console.log('👤 Criando novo usuário...')
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: {
        name: payment.payer.first_name + ' ' + (payment.payer.last_name || ''),
        created_by: 'mercadopago',
      }
    })

    if (userError) {
      console.error('❌ Erro ao criar usuário:', userError)
      throw userError
    }

    userId = newUser.user.id
    console.log('✅ Usuário criado:', userId)
  }

  // 3. Calcular data de expiração
  const endDate = calculateEndDate(planType)

  // 4. Criar/atualizar assinatura
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_type: planType,
      status: 'active',
      mp_payment_id: String(payment.id),
      mp_payer_email: email,
      mp_payer_id: String(payment.payer.id),
      start_date: new Date().toISOString(),
      end_date: endDate,
      created_by: 'mercadopago',
      metadata: {
        amount_paid: payment.transaction_amount,
        payment_method: payment.payment_method_id,
        payment_type: payment.payment_type_id,
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
  await supabase
    .from('mercadopago_transactions')
    .update({ subscription_id: subscription.id })
    .eq('payment_id', String(payment.id))

  console.log('✅ Assinatura criada/atualizada:', subscription.id)
}

async function handleRefundedPayment(supabase: any, payment: any) {
  console.log('💸 Processando reembolso...')

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('mp_payment_id', String(payment.id))

  if (error) {
    console.error('❌ Erro ao cancelar assinatura:', error)
    throw error
  }

  console.log('✅ Assinatura cancelada por reembolso')
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
