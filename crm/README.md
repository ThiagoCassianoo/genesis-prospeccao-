# CRM — Twenty (módulo 2)

Fecha o sistema de 3 módulos: descoberta (`pesquisa/` + `coleta/`) → **CRM
com pipeline (este módulo)** → automação de WhatsApp (`whatsapp-bot/`).

Não construí um CRM do zero — adotei o [Twenty](https://github.com/twentyhq/twenty),
open-source, self-hostável, com pipeline de oportunidade nativo. Este
módulo só faz a ponte: `coleta/leads.csv` → empresas no Twenty.

## Por que Twenty e não algo próprio
CRM com pipeline de verdade (estágios, histórico de atividade, UI) é
trabalho grande — reconstruir isso quando já existe um projeto maduro e
gratuito seria o oposto do "extrair o ouro que já existe".

## Subir o Twenty (self-hosted, grátis)
```bash
git clone https://github.com/twentyhq/twenty.git
cd twenty/packages/twenty-docker
docker compose up -d
```
Depois: crie um workspace, gere uma API key em
**Configurações → API & Webhooks**, e confirme a URL base da API da sua
instância (geralmente `http://localhost:3000/rest` — a doc interativa
fica exposta ali mesmo).

## Configurar a sincronização
```bash
# .env
TWENTY_API_URL=http://localhost:3000/rest
TWENTY_API_KEY=<sua chave>
```
```bash
node crm/src/sync-twenty.js
```
Cria uma "company" no Twenty pra cada lead com status `pendente` ou
`enviado` em `coleta/leads.csv`.

## Kanban automático (o que já anda sozinho)
`crm/src/sync-twenty.js` cria company + opportunity em estágio `NOVO`
na 1ª sincronização, e `atualizarEstagio()` move o card sozinho quando o
funil avança de verdade — chamado automaticamente por
`whatsapp-bot/src/index.js`:
- Mensagem enviada → estágio `CONTATADO`.
- Lead responde (qualquer coisa que não seja opt-out) → estágio `RESPONDEU`.

Estado local (`crm/state/twenty-ids.json`, gitignored) guarda o par
telefone → {companyId, opportunityId} pra saber o que já existe e não
duplicar.

## Nomes de estágio são configuráveis (flexível de propósito)
Cada workspace do Twenty nomeia o pipeline diferente. Ajuste no `.env`
antes de rodar, conferindo os nomes reais em
**Oportunidades → configurar pipeline** na sua instância:
```bash
TWENTY_STAGE_FIELD=stage        # nome do campo de estágio na sua instância
TWENTY_STAGE_NOVO=NEW
TWENTY_STAGE_CONTATADO=CONTACTED
TWENTY_STAGE_RESPONDEU=MEETING
```

## O que ainda não está automático (de propósito, não por preguiça)
- **Reunião → Cliente**: esses dois estágios continuam manuais — não
  existe evento automático confiável pra "marcou reunião" ou "fechou
  contrato", isso é julgamento humano, não dado de sistema.
- **Não testado ao vivo**: a chamada de API é baseada na documentação
  pública do Twenty — a rede deste ambiente de desenvolvimento bloqueia
  `docs.twenty.com`, então não rodei contra uma instância real. Rode
  com um lead de teste antes de confiar no lote inteiro.
