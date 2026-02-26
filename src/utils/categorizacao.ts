// Função utilitária para normalizar strings (remover acentos, etc.)
export function normalizar(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

type RegraCategoria = {
  termo: string;
  termoNormalizado: string;
  categoria: string;
};

function parseRegrasCategorias(regrasTexto: string): RegraCategoria[] {
  return (regrasTexto || '')
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha && !linha.startsWith('#'))
    .map((linha) => {
      const idx = linha.indexOf('=');
      if (idx <= 0 || idx >= linha.length - 1) return null;
      const termo = linha.slice(0, idx).trim();
      const categoria = linha.slice(idx + 1).trim();
      if (!termo || !categoria) return null;
      // Evita regras muito genéricas como "a = Academia", que categorizam quase tudo.
      const termoNormalizado = normalizar(termo);
      if (termoNormalizado.length < 2) return null;
      return {
        termo,
        termoNormalizado,
        categoria: categoria.charAt(0).toUpperCase() + categoria.slice(1),
      };
    })
    .filter((regra): regra is RegraCategoria => Boolean(regra));
}

// Categorizar uma descrição com base nas regras de texto
export function categorizar(descricao: string, regrasTexto: string): string {
  if (!descricao) return '';
  const descNorm = normalizar(descricao);
  const regras = parseRegrasCategorias(regrasTexto);
  let melhorCategoria = '';
  let melhorTamanhoTermo = -1;

  for (const regra of regras) {
    if (descNorm.includes(regra.termoNormalizado)) {
      const tamanhoTermo = regra.termoNormalizado.length;
      // Prioriza regra mais específica (termo mais longo).
      if (tamanhoTermo > melhorTamanhoTermo) {
        melhorTamanhoTermo = tamanhoTermo;
        melhorCategoria = regra.categoria;
      }
    }
  }
  return melhorCategoria;
}

// Regras padrão de categorização
export const REGRAS_PADRAO = `# ===== CATEGORIAS DE CARTÃO =====

# Alimentação
ifood = Alimentação
ubereats = Alimentação
restaurante = Alimentação
lanchonete = Alimentação
padaria = Alimentação
pizzaria = Alimentação
hamburgueria = Alimentação
habibs = Alimentação
outback = Alimentação
mcdonalds = Alimentação
burger king = Alimentação
bk = Alimentação
giraffas = Alimentação
subway = Alimentação
spoleto = Alimentação
supermercado = Alimentação
carrefour = Alimentação
pao de acucar = Alimentação
assai = Alimentação

# Transporte
uber = Transporte
99 app = Transporte
99pop = Transporte
cabify = Transporte
indriver = Transporte
taxi = Transporte

# Compras
mercado livre = Compras
magalu = Compras
americanas = Compras
submarino = Compras
casas bahia = Compras
shopee = Compras
amazon = Compras
kabum = Compras
fast shop = Compras
centauro = Compras
kalunga = Compras
shein = Compras
aliexpress = Compras
paypal = Compras
pagseguro = Compras
stone = Compras
sumup = Compras
getnet = Compras
cielo = Compras
rede = Compras

# Assinaturas
netflix = Assinaturas
spotify = Assinaturas
prime video = Assinaturas
disney = Assinaturas
globoplay = Assinaturas
max = Assinaturas
hbo = Assinaturas
youtube premium = Assinaturas
apple tv = Assinaturas
apple music = Assinaturas
icloud = Assinaturas
google one = Assinaturas
microsoft 365 = Assinaturas
adobe = Assinaturas
chatgpt = Assinaturas
notion = Assinaturas
onepassword = Assinaturas
deezer = Assinaturas
paramount = Assinaturas
canva = Assinaturas

# Saúde
hospital = Saúde
clinica = Saúde
laboratorio = Saúde
exame = Saúde
vacina = Saúde
dasa = Saúde
fleury = Saúde
sabin = Saúde
einstein = Saúde
sirio = Saúde
unimed = Saúde
amil = Saúde
hapvida = Saúde
prevent = Saúde
farmacia = Saúde
drogaraia = Saúde
droga raia = Saúde
drogasil = Saúde
pacheco = Saúde

# Combustível
posto = Combustível
gasolina = Combustível
etanol = Combustível
diesel = Combustível
ipiranga = Combustível
shell = Combustível
br = Combustível

# Lazer
cinema = Lazer
cinemark = Lazer
cinepolis = Lazer
teatro = Lazer
show = Lazer
ingresso = Lazer
parque = Lazer
museu = Lazer
thermas = Lazer
hotel = Lazer
booking = Lazer
decolar = Lazer
airbnb = Lazer
resort = Lazer
sympla = Lazer

# Academia
smart fit = Academia
bluefit = Academia
selfit = Academia
bodytech = Academia
just fit = Academia
gympass = Academia
academia = Academia
fitness = Academia

# Vestuário
renner = Vestuário
riachuelo = Vestuário
cea = Vestuário
c&a = Vestuário
zara = Vestuário
hering = Vestuário
marisa = Vestuário
youcom = Vestuário
netshoes = Vestuário
dafiti = Vestuário
lojas leroy = Vestuário

# Educação
escola = Educação
faculdade = Educação
universidade = Educação
curso = Educação
ead = Educação
alura = Educação
rocketseat = Educação
udemy = Educação
coursera = Educação
senai = Educação
etec = Educação

# Serviços
manicure = Serviços
barbearia = Serviços
salao = Serviços
cabeleireiro = Serviços
esmalteria = Serviços
barber = Serviços

# Utilidades
luz = Utilidades
energia = Utilidades
enel = Utilidades
light = Utilidades
cemig = Utilidades
copel = Utilidades
equatorial = Utilidades
rge = Utilidades
celesc = Utilidades
cpfl = Utilidades
energisa = Utilidades
aguasaneos = Utilidades
sabesp = Utilidades
sanepar = Utilidades
copasa = Utilidades
caesb = Utilidades
internet = Utilidades
vivo = Utilidades
claro = Utilidades
tim = Utilidades
oi = Utilidades
telephone = Utilidades
celular = Utilidades`;
