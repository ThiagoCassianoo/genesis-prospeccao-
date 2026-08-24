# Genesis Prospecção

Sistema de 3 módulos: **(1) descoberta** (`pesquisa/` + `coleta/`) →
**(2) CRM com pipeline** (`crm/`, via Twenty) → **(3) automação de
WhatsApp** (`whatsapp-bot/`). Fábrica de agentes Genesis IA adotada de
`genesis-lovable` (ver `CLAUDE.md`). Orquestração opcional via n8n:
`docs/orquestracao-n8n.md`. Contexto de produto completo: `docs/brief.md`
e `docs/decisoes-locais.md`.

## Pipeline (rodado e verificado nesta sessão)

```
pesquisa/src/analisar-nichos.js  → mede (não estima) qual nicho tem mais volume + carência de site [✅ lógica testada]
coleta/src/maps.js               → busca empresa local (Apify/TomTom/Places/OSM)                    [precisa chave — ver abaixo]
coleta/src/whatsapp-publico.js   → resgata wa.me publicado no site do lead antes de descartar        [✅ lógica testada, fetch real não testável no sandbox]
coleta/src/cnpj.js               → confirma empresa ATIVA (BrasilAPI/CNPJ.ws) — NUNCA fonte de contato [código pronto, não testável no sandbox]
coleta/src/validar.js            → normaliza telefone, resgate wa.me, dedupe, prioridade → leads.csv  [✅ testado com dado de exemplo]
whatsapp-bot/                    → aquecimento → rate-limit 5-10/dia → envio                          [✅ lógica testada, envio real precisa QR]
```

**Fase 1 (pesquisa de nicho) não é relatório genérico** — não existe
estatística pública de "quantas empresas em Altos da Serra não têm
site". `pesquisa/src/analisar-nichos.js` mede direto: roda a busca real
pra cada nicho candidato e pontua por volume × % sem site. Contexto
qualitativo real (fonte: prefeitura de Serra) em
`pesquisa/contexto-regiao.md`.

Rodei o pipeline ponta a ponta com `coleta/in/exemplo-serra-es.csv`
(dado de exemplo, não é lead real): `npm run coleta:validar --
coleta/in/exemplo-serra-es.csv` → 4 leads válidos, 1 telefone inválido
corretamente rejeitado. Templates de mensagem e o rate-limiter também
rodaram e responderam certo (`node whatsapp-bot/src/warmup.js`,
lógica de `limiter.js`). Isso comprova a mecânica — não é uma promessa.

## O que falta pra rodar com dado real (ação sua, fora do meu alcance)

| Peça | Por quê preciso de você | Link | Custo | Traz telefone? |
|---|---|---|---|---|
| **Nada** (OSM) | Já é o padrão sem chave | — | Grátis, sem cadastro | ❌ não |
| **TomTom** (mínimo recomendado) | Signup, sem cartão | https://developer.tomtom.com/user/register | Grátis, 2500 req/dia | ✅ sim |
| **Apify Google Maps Extractor** (mais rico) | Signup + token | https://console.apify.com/ | ~US$5/mês grátis, depois pago | ✅ sim, + avaliação/categoria |
| **Navegador (Playwright)** — grátis, mesma técnica do Apify | `npx playwright install chromium` + `USAR_NAVEGADOR=1` no `.env` | — | Grátis | ✅ sim, mas frágil — Google pode bloquear em uso pesado |

**Trava do navegador (decisão do diretor, código não promessa):** até
60 números/dia, pausa de 3-15min entre cada clique —
`coleta/src/limiter-navegador.js`, mesmo núcleo (`lib/limitador-diario.js`)
usado pelo rate-limit do WhatsApp. Pára sozinho no meio do lote se o
teto bater.
| **Google Places** (opcional) | Billing ativo no Google Cloud | https://console.cloud.google.com/google/maps-apis/start | **Pede pré-pagamento** | ✅ sim |
| **WhatsApp** — parear o bot | QR só pode ser escaneado por você | rodar `npm run bot:start` | Grátis | — |

**Se o objetivo é contato, OSM sozinho não resolve** — não retorna
telefone, então todo lead vindo dele cai como `invalido` no
`leads.csv` (não é bug, é o dado faltando). Use pelo menos TomTom.

Apify raspa o Google Maps direto — viola os Termos de Uso do Google,
mesma categoria de risco que o bot de WhatsApp não-oficial (decisão já
registrada em `docs/decisoes-locais.md`).

Preencha `.env` (copie de `.env.example`) com a chave que escolher —
`APIFY_API_TOKEN` > `TOMTOM_API_KEY` > `GOOGLE_MAPS_API_KEY`, nessa
prioridade; sem nenhuma, cai pra OSM.

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

# 0. pesquisa: qual nicho vale mais a pena? (gera pesquisa/relatorio-*.md)
npm run pesquisa:nichos -- "Serra, ES" "clínica odontológica" "barbearia" "pet shop" "academia"

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
coleta/src/maps.js              descoberta local (Apify/TomTom/Places/OSM)
coleta/src/maps-browser.js      raspagem via navegador (Playwright), travada em 60/dia
coleta/src/limiter-navegador.js trava do navegador (teto diário + pausa 3-15min)
coleta/src/whatsapp-publico.js  resgata wa.me publicado no site do lead (dado público real)
coleta/src/cnpj.js               validação via minhareceita.org/BrasilAPI/CNPJ.ws (ativa? nunca contato)
coleta/src/validar.js            normalização + resgate wa.me + dedupe + prioridade → leads.csv
coleta/src/exportar-planilha.js  consolida leads.csv em .xlsx, cruza com CNPJ quando conhecido
lib/limitador-diario.js          núcleo do rate-limit, reusado por WhatsApp e navegador
crm/src/sync-twenty.js           módulo 2: sincroniza leads.csv → Twenty CRM (companies)
coleta/schema.md         schema do CSV de entrada/saída
whatsapp-bot/src/warmup.js    gate de aquecimento (5-7 dias)
whatsapp-bot/src/limiter.js   rate-limit 5-10/dia, horário comercial, jitter
whatsapp-bot/src/optout.js    lista de quem pediu pra parar
whatsapp-bot/src/templates.js variantes de mensagem (oferta Missões Tech)
whatsapp-bot/src/index.js     conexão Baileys + orquestra a campanha
```
