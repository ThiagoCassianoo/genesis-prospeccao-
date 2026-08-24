# Schema de lead — `leads.csv`

Colunas obrigatórias que `validar.js` espera na entrada (qualquer fonte —
export do Vibe Prospecting, TomTom, Places, planilha manual — precisa
mapear pra isso antes de rodar `npm run coleta:validar`):

| Coluna | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `nome` | texto | sim | Nome da empresa |
| `telefone` | texto | sim | Qualquer formato BR — `validar.js` normaliza pra E.164 |
| `categoria` | texto | não | Nicho/segmento (ex: "clínica odontológica") |
| `cidade` | texto | não | Cidade/bairro |
| `site` | texto | não | Usado pro ICP: sem site = sinal forte de lead qualificado |
| `fonte` | texto | sim | `vibe-prospecting` / `tomtom` / `places` / `manual` — rastreabilidade |

## Saída (`leads.csv`, gerado por `validar.js`)
Mesmas colunas + `status` (`pendente`/`invalido`/`duplicado`) e
`telefone_e164`. Só linhas `status=pendente` entram no bot.

## Como alimentar a entrada
1. No Claude Code (com os MCPs conectados), rode a pesquisa de nicho e
   peça pra buscar empresas via Vibe Prospecting; exporte com
   `export-to-csv` do próprio MCP.
2. Salve o CSV exportado em `coleta/in/<fonte>-<data>.csv`.
3. `npm run coleta:validar -- coleta/in/<arquivo>.csv` — gera/atualiza
   `coleta/leads.csv` (gitignored, contém dado real).
