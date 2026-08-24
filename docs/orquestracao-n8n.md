# n8n — orquestração visual (opcional)

n8n não substitui nada que já existe aqui — ele encadeia o que já
construí sem você precisar mexer em código pra rodar no automático ou
mudar a ordem/frequência.

**Por que não entreguei um arquivo `.json` pra importar direto:** um
workflow de n8n exportado errado não avisa erro, só falha silenciosamente
ou importa quebrado — prefiro te dar o desenho certo pra montar em 10
minutos na interface do que um arquivo que talvez não abra.

## Subir o n8n (self-hosted, grátis)
```bash
docker run -it --rm -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

## Fluxo recomendado (nós, nessa ordem)

1. **Schedule Trigger** — roda 1x/dia, horário comercial (ex: 9h).
2. **Execute Command** — `node pesquisa/src/analisar-nichos.js "Serra, ES" "nicho1" "nicho2"`.
   Lê o `pesquisa/relatorio-*.md` gerado no próximo nó (`Read File`) se
   quiser decidir o nicho do dia automaticamente; ou fixe o nicho como
   parâmetro se preferir controlar manualmente.
3. **Execute Command** — `node coleta/src/maps.js "<nicho>" "Serra, ES" > coleta/in/dia.json`.
4. **Execute Command** — `npm run coleta:validar -- coleta/in/dia.json`.
5. **Execute Command** — `node crm/src/sync-twenty.js` (módulo 2).
6. **IF** — checa `restantesHoje` do aquecimento/rate-limit
   (`GET http://localhost:3000/api/status` do painel web) antes de
   liberar o próximo nó. Nunca pula essa checagem — é a mesma trava que
   protege o número, só que acionada pelo n8n em vez de você rodando na mão.
7. **Execute Command** — `npm run bot:start` (só se o IF acima liberou).
8. **Slack/Email/Telegram node** (opcional) — te avisa quando a rodada
   do dia terminou, com o resumo (`{{ $json.pendente }}` leads novos,
   `{{ $json.restantesHoje }}` mensagens enviadas).

## O que o n8n ganha que rodar `cron` puro não dá
Visibilidade (vê cada execução, erro, retry na interface) e edição sem
deploy — muda o nicho, o horário, ou adiciona um passo sem tocar em
código. Pro seu perfil (quer "conectar", não reescrever), é o encaixe
certo como cola entre os módulos.

## O que fica de fora, por decisão
Não usar o n8n pra reimplementar `limiter.js`/`warmup.js` — essas travas
são código versionado e testado (`npm test`), não devem virar lógica
escondida dentro de um nó de workflow que ninguém revisa em PR.
