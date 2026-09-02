import{$ as u}from"./index-tzVZ_kWR.js";import"./react-vendor-BudMQKA9.js";import"./supabase-DEvIEdQL.js";import"./pdf-export-it0kIn5U.js";import"./ui-BL1_QJ_4.js";import"./charts-D2HwGgrl.js";import"./query-BOHQlbnj.js";import"./router-DMf_6P6h.js";function n(e){return(e||"").normalize("NFD").replace(new RegExp("\\p{Diacritic}","gu"),"").replace(/\s+/g," ").trim().toLowerCase()}function p(e){return(e||"").split(`
`).map(a=>a.trim()).filter(a=>a&&!a.startsWith("#")).map(a=>{const s=a.indexOf("=");if(s<=0||s>=a.length-1)return null;const i=a.slice(0,s).trim(),r=a.slice(s+1).trim();if(!i||!r)return null;const o=n(i);return o.length<2?null:{termoNormalizado:o,categoria:r.charAt(0).toUpperCase()+r.slice(1)}}).filter(a=>!!a)}const g=(e,a)=>a.length>3||/\s/.test(a)?e.includes(a):` ${e.replace(/[^a-z0-9&]+/g," ")} `.includes(` ${a} `);function U(e,a,s){if(!e)return"";const i=n(e),r=n(String(s||"")),o=p(a);let d="",m=-1;for(const t of o){const c=u(t.categoria);if((!r||!c||c===r)&&g(i,t.termoNormalizado)){const l=t.termoNormalizado.length;l>m&&(m=l,d=t.categoria)}}return d}const x=`# ===== ENTRADAS =====

# Salário
folha pagamento mensal = Salário
folha pagto 13 salario = Salário
folha de ferias = Salário
folha de participacao = Salário
13 salario = Salário
salario = Salário

# Benefícios
sispag fund saude = Benefícios

# Investimentos recebidos (resgates e rendimentos)
resgate cofrinhos = Investimentos
resgate cdb = Investimentos
di resgate cdb = Investimentos
cof resgate cdb = Investimentos
cor tes direto venda = Investimentos
cor amortizacao = Investimentos
cor amtz = Investimentos
cor juros = Investimentos
cor jurs = Investimentos
juros rf = Investimentos
rend pago = Investimentos
resgate = Investimentos
rendimento = Rendimentos
dividendo = Rendimentos

# Transferências recebidas
transferencia recebida = Transferência
ted = Transferência
doc = Transferência

# ===== SAÍDAS =====

# Aplicações e aportes
aplicacao cofrinhos = Investimento
aplicacao cdb = Investimento
pix transf avenue = Investimento
aplicacao = Investimento

# Pagamento de fatura
fatura paga personnalite = Pagamento de Fatura
fatura paga person multi = Pagamento de Fatura
pix qrs portoseg = Pagamento de Fatura
pix qrs mercado pag = Pagamento de Fatura
pgto itau itau = Pagamento de Fatura
pagamento de fatura = Pagamento de Fatura
pag fatura = Pagamento de Fatura

# Impostos, taxas e seguros
pagto ipva = Impostos e Taxas
pag ipva = Impostos e Taxas
ipva = Impostos e Taxas
iof = Impostos e Taxas
seguro cartao = Seguros
seguro = Seguros

# Regras específicas identificadas no extrato
pix transf tania = Saúde
terra park = Lazer
editora e distribuidora educ = Educação
cor comp deb agu = Utilidades

# Transferências e saques (regra genérica, usada só quando nenhuma específica casar)
transferencia enviada = Transferência
pix transf = Transferência
pix = Transferência
saque banco24h = Transferência
saque din atm = Transferência

# ===== COMPRAS NO CARTÃO E CONTA =====

# Alimentação
ifood = Alimentação
ifd = Alimentação
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
haru = Alimentação
oxxo = Alimentação

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

# Casa e moradia
lojas leroy = Casa
leroy merlin = Casa

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
celular = Utilidades`;export{x as REGRAS_PADRAO,U as categorizar,n as normalizar};
