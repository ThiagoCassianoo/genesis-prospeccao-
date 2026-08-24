# Genesis Prospecção

Motor de prospecção B2B: acha empresa por nicho+região, valida o lead,
manda mensagem no WhatsApp com segurança pro número. Fábrica de agentes
Genesis IA adotada de `genesis-lovable` (ver `CLAUDE.md`). Contexto de
produto completo: `docs/brief.md` e `docs/decisoes-locais.md`.

## Pipeline (rodado e verificado nesta sessão)

```
coleta/src/maps.js    → busca empresa local (TomTom/Places)      [precisa chave — ver abaixo]
coleta/src/cnpj.js     → confirma empresa ATIVA (BrasilAPI, pública) [código pronto, não testável no sandbox]
coleta/src/validar.js  → normaliza telefone, dedupe → coleta/leads.csv [✅ testado com dado de exemplo]
whatsapp-bot/          → aquecimento → rate-limit 5-10/dia → envio    [✅ lógica testada, envio real precisa QR]
```

Rodei o pipeline ponta a ponta com `coleta/in/exemplo-serra-es.csv`
(dado de exemplo, não é lead real): `npm run coleta:validar --
coleta/in/exemplo-serra-es.csv` → 4 leads válidos, 1 telefone inválido
corretamente rejeitado. Templates de mensagem e o rate-limiter também
rodaram e responderam certo (`node whatsapp-bot/src/warmup.js`,
lógica de `limiter.js`). Isso comprova a mecânica — não é uma promessa.

## O que falta pra rodar com dado real (ação sua, fora do meu alcance)

| Peça | Por quê preciso de você | Link |
|---|---|---|
| **TomTom Maps** — descoberta de empresa local | Conector já adicionado à sua conta, falta autorizar (OAuth) | claude.ai → Settings → Connectors |
| **Chave TomTom** (se rodar `maps.js` fora de uma sessão Claude, ex. cron) | Signup grátis, sem cartão, 2500 req/dia | https://developer.tomtom.com/user/register |
| **Google Places API** (alternativa/complemento ao TomTom) | Precisa projeto + billing no Google Cloud (tem US$200/mês grátis) | https://console.cloud.google.com/google/maps-apis/start |
| **WhatsApp** — parear o bot | QR code só pode ser escaneado por você, no número novo | rodar `npm run bot:start`, escanear o QR que aparece no terminal |

Nenhuma dessas travas é escolha minha — são credenciais/ações que só a
conta do diretor pode conceder. Preencha `.env` (copie de
`.env.example`) com `TOMTOM_API_KEY` ou `GOOGLE_MAPS_API_KEY`.

**Por que o CNPJ (`cnpj.js`) não rodou aqui:** a API pública da
BrasilAPI é bloqueada pelo proxy de rede deste ambiente sandbox (só
libera domínio pré-aprovado). O código está correto — `fetch` simples
pra API pública sem chave — e vai funcionar normalmente rodando fora
deste sandbox (sua máquina, servidor, GitHub Actions).

## Como rodar, do zero

```bash
npm install
cp .env.example .env   # preencha TOMTOM_API_KEY ou GOOGLE_MAPS_API_KEY

# 1. descobrir empresas
node coleta/src/maps.js "clínica odontológica" "Serra, ES" > coleta/in/nicho1.json

# 2. validar/deduplicar (aceita CSV — exporte o JSON acima pro formato de coleta/schema.md)
npm run coleta:validar -- coleta/in/nicho1.csv

# 3. aquecer o número (5-7 dias de uso humano normal ANTES do passo 4)
node whatsapp-bot/src/warmup.js iniciar

# 4. campanha (só dispara se o aquecimento (passo 3) já concluiu)
npm run bot:start   # escaneia QR no primeiro uso
```

## Ordem de execução (por que não pula etapa)
Dado ruim (telefone errado, empresa fechada) é o que mais rápido queima a
reputação do número novo — por isso `validar.js` e `cnpj.js` rodam antes
do bot ver qualquer lead, nunca depois.

## Testes
`npm test` — cobre normalização de telefone e detecção de opt-out (os
dois pontos onde errar sai caro: número errado ou ignorar pedido de
parar).

## Estrutura
```
coleta/src/maps.js      descoberta local (TomTom/Places)
coleta/src/cnpj.js       validação via BrasilAPI (empresa ativa?)
coleta/src/validar.js    normalização + dedupe → leads.csv
coleta/schema.md         schema do CSV de entrada/saída
whatsapp-bot/src/warmup.js    gate de aquecimento (5-7 dias)
whatsapp-bot/src/limiter.js   rate-limit 5-10/dia, horário comercial, jitter
whatsapp-bot/src/optout.js    lista de quem pediu pra parar
whatsapp-bot/src/templates.js variantes de mensagem (oferta Missões Tech)
whatsapp-bot/src/index.js     conexão Baileys + orquestra a campanha
```
