// API Express para criar usuários no Supabase com service_role
require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRole);

app.post('/create-user', async (req, res) => {
  const { email, password, nome, ...profile } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }
  try {
    // Cria usuário no Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome }
    });
    if (authError) throw authError;

    // Atualiza perfil
    const { error: profileError } = await supabase.from('profiles').update({
      nome,
      email,
      ...profile
    }).eq('id', authUser.user.id);
    if (profileError) throw profileError;

    res.json({ success: true, user: authUser.user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
