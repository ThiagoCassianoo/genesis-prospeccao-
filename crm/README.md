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

## O que ainda não está automático (de propósito, não por preguiça)
- **Pipeline/estágio da oportunidade**: cada workspace do Twenty pode
  ter nomes de estágio diferentes (Novo/Contatado/Reunião/Cliente, ou o
  que você configurar). Não travei um nome de estágio no código porque
  eu inventaria valor que pode não bater com sua instância — confirme
  os nomes reais em **Oportunidades → configurar pipeline** e adicione
  a chamada de criação de oportunidade em `sync-twenty.js` depois.
- **Sincronização de resposta do WhatsApp → CRM**: hoje o bot só
  detecta opt-out. Fechar esse elo (resposta recebida → atualiza card no
  Twenty) é o próximo passo natural, não construído ainda.
- **Não testado ao vivo**: a chamada de API é baseada na documentação
  pública do Twenty — a rede deste ambiente de desenvolvimento bloqueia
  `docs.twenty.com`, então não rodei contra uma instância real. Rode
  com um lead de teste antes de confiar no lote inteiro.
