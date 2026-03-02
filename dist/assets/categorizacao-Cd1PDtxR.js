function l(e){return(e||"").normalize("NFD").replace(new RegExp("\\p{Diacritic}","gu"),"").replace(/\s+/g," ").trim().toLowerCase()}function d(e){return(e||"").split(`
`).map(a=>a.trim()).filter(a=>a&&!a.startsWith("#")).map(a=>{const s=a.indexOf("=");if(s<=0||s>=a.length-1)return null;const r=a.slice(0,s).trim(),i=a.slice(s+1).trim();if(!r||!i)return null;const o=l(r);return o.length<2?null:{termo:r,termoNormalizado:o,categoria:i.charAt(0).toUpperCase()+i.slice(1)}}).filter(a=>!!a)}function m(e,a){if(!e)return"";const s=l(e),r=d(a);let i="",o=-1;for(const t of r)if(s.includes(t.termoNormalizado)){const n=t.termoNormalizado.length;n>o&&(o=n,i=t.categoria)}return i}const u=`# ===== CATEGORIAS DE CARTÃO =====

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
celular = Utilidades`;export{u as REGRAS_PADRAO,m as categorizar,l as normalizar};
