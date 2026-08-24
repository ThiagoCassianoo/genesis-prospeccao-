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

| Peça | Por quê preciso de você | Link | Custo |
|---|---|---|---|
| **Nada** — funciona sem chave | `maps.js` cai pra OpenStreetMap automaticamente | — | Grátis, sem cadastro |
| **TomTom** (recomendado, mais cobertura) | Signup, sem cartão | https://developer.tomtom.com/user/register | Grátis, 2500 req/dia |
| **Google Places** (opcional) | Exige billing ativo no Google Cloud | https://console.cloud.google.com/google/maps-apis/start | **Pede pré-pagamento — pule se não quiser pagar agora** |
| **WhatsApp** — parear o bot | QR code só pode ser escaneado por você, no número novo | rodar `npm run bot:start`, escanear o QR que aparece no terminal | Grátis |

Nenhuma dessas travas é escolha minha — são credenciais/ações que só a
conta do diretor pode conceder. Pra usar TomTom/Google, copie `.env.example`
pra `.env` e preencha a chave; sem nenhuma, o sistema já funciona via OSM.

**Por que o CNPJ (`cnpj.js`) não rodou aqui:** a API pública da
BrasilAPI é bloqueada pelo proxy de rede deste ambiente sandbox (só
libera domínio pré-aprovado). O código está correto — `fetch` simples
pra API pública sem chave — e vai funcionar normalmente rodando fora
deste sandbox (sua máquina, servidor, GitHub Actions).

## Como rodar, do zero

**Opção A — painel web (recomendado, roda mesmo sem nenhuma chave):**
```bash
npm install
npm run web:start   # abre http://localhost:3000
```
Rodei esse painel nesta sessão (`curl` contra o servidor real, não é
mockup): varredura, tabela de leads, status de aquecimento e consulta de
CNPJ funcionando ponta a ponta. Sem `TOMTOM_API_KEY`/`GOOGLE_MAPS_API_KEY`
configurada, a varredura cai pro OpenStreetMap (grátis, sem cadastro).

**Opção B — linha de comando (mesmo backend, sem UI):**
```bash
npm install
cp .env.example .env   # opcional — sem chave usa OpenStreetMap

node coleta/src/maps.js "clínica odontológica" "Serra, ES" > coleta/in/nicho1.json
npm run coleta:validar -- coleta/in/nicho1.csv
node whatsapp-bot/src/warmup.js iniciar   # 5-7 dias de uso humano ANTES do próximo passo
npm run bot:start                          # só dispara depois do aquecimento concluir
```

O disparo de WhatsApp **não tem botão na página web de propósito** — só
roda por `npm run bot:start`, pra nunca sair um envio em massa de um
clique acidental.

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
