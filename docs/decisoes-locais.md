# Decisões locais — Genesis Prospecção

Decisão específica deste projeto. Decisão que vira padrão pra qualquer
projeto da fábrica vai em `genesis-lovable/docs/decisoes.md` (repo 1),
não aqui.

## 2026-08-24 — Nome do repo genérico
`genesis-prospeccao-` em vez de `genesis-prospeccao-serra-es`. Motivo:
Altos da Serra/ES é o piloto, não o produto. Região e nicho são parâmetro
de execução (`pesquisa/`, `coleta/`), nunca hardcode.

## 2026-08-24 — WhatsApp via Baileys (não-oficial), com aquecimento
Confirmado risco de banimento com o diretor (biblioteca não-oficial viola
ToS do WhatsApp para automação). Decisão: aceitar o risco, mitigar com
aquecimento manual de 5-7 dias (uso humano normal — entrar em grupos,
mandar mensagem normal) antes de ligar o bot, e rate-limit de 5-10
mensagens/dia com intervalo humano-aleatório desde o primeiro disparo
automatizado. Alternativa recomendada (API oficial Meta Cloud) foi
apresentada e recusada — não é decisão do agente, é decisão do diretor
registrada aqui pra não ser re-litigada a cada sessão.

## 2026-08-24 — Telefone do CNPJ não é confiável pra campanha
Pesquisa real (thread de programador brasileiro, não suposição): o
telefone cadastrado no CNPJ costuma ser do escritório de contabilidade
que abriu a empresa, não da empresa em si. `coleta/src/cnpj.js` mantém
esse campo só como `telefone_cnpj_nao_confiavel` — nunca usado como
contato de campanha. Contato real vem de `coleta/src/maps.js` (telefone
que o dono cadastrou no Google/Maps). Também explica o modelo de
Capturama/Datagma: dado de CNPJ é grátis (mesma base pública que já uso);
contato confiável é sempre produto pago de base proprietária — não existe
atalho gratuito pra isso além do que o Maps já entrega.

## 2026-08-24 — Módulo 2 (CRM) é Twenty, não construído do zero
Diretor pediu explicitamente "algo integrado" como o Twenty CRM em vez
de construir pipeline/kanban próprio. Decisão: adotar Twenty
(self-hosted, open-source), `crm/src/sync-twenty.js` só faz a ponte
leads.csv → companies. Avaliados e descartados: GMapsScraper
(Anonym0usWork1221, Python, fragmentaria a stack, sem trava de
rate-limit) e o projeto n8n+Serper+Perplexity+GPT-4o do Awaisali36
(3 APIs pagas, 15 estrelas, contradiz orçamento zero do diretor).
Evolution API (pergunta de sessão anterior) também descartado — mesma
Baileys por baixo, só adiciona infra sem reduzir risco no estágio atual.

## 2026-08-24 — Fonte de dado: MCPs já conectados primeiro
Vibe Prospecting (Explorium) e Firecrawl já autorizados na conta — usar
como fonte primária, zero setup. TomTom Maps foi adicionado à conta mas
precisa autorização manual (OAuth) — pendente, ver `README.md`. Google
Places API oficial fica fora do v1: exigiria o diretor criar projeto no
Google Cloud + billing, e as fontes já conectadas cobrem o piloto.
