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

## 2026-08-24 — Fonte de dado: MCPs já conectados primeiro
Vibe Prospecting (Explorium) e Firecrawl já autorizados na conta — usar
como fonte primária, zero setup. TomTom Maps foi adicionado à conta mas
precisa autorização manual (OAuth) — pendente, ver `README.md`. Google
Places API oficial fica fora do v1: exigiria o diretor criar projeto no
Google Cloud + billing, e as fontes já conectadas cobrem o piloto.
