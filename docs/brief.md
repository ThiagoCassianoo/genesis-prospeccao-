# Brief — Genesis Prospecção

## Job real
Gerar pipeline de vendas qualificado para a **Missões Tech** (sites,
marketing digital, sistemas): encontrar empresas de nicho promissor numa
região, contatá-las via WhatsApp com uma oferta relevante, converter em
reunião.

## North Star Metric
**Reuniões agendadas a partir de leads deste pipeline.** Não é "leads
raspados" nem "mensagens enviadas" — esses dois viram vaidade se o resto
não converte. Métricas secundárias que importam:
- Taxa de resposta (respostas / mensagens entregues)
- Taxa de bloqueio/report (sinal de saúde do número — meta: 0%)
- Taxa de conversão resposta → reunião

## ICP (piloto)
Empresa pequena/média em Altos da Serra/ES (ou nicho equivalente quando
expandir), com sinal de precisar de presença digital: sem site, site
desatualizado, sem perfil ativo em rede social, ou nicho com concorrência
que já investe em marketing digital e ela não.

## Escopo MVP (fatiar por valor, não por camada técnica)
1. **1 nicho piloto**, definido pela pesquisa de mercado (fase 1) — não
   pelo diretor a priori.
2. **~30 leads reais**, validados (telefone correto, empresa ativa).
3. **Aquecimento do número** (5-7 dias, uso humano normal — decisão
   registrada em `docs/decisoes-locais.md`).
4. **5-10 mensagens/dia**, intervalo humano-aleatório, medir taxa de
   resposta antes de escalar volume ou generalizar pra outro
   nicho/região.

Só depois desse ciclo provar sinal (taxa de resposta > 0 de forma
consistente, sem bloqueio) é que o pipeline generaliza pra outro
estado/nicho — é literalmente o motivo do repo se chamar
`genesis-prospeccao-` (genérico) e não `-serra-es`.

## Riscos assumidos e como o código responde
| Risco | Mitigação no código |
|---|---|
| Ban do número novo | `whatsapp-bot/src/warmup.js` bloqueia envio automatizado até o aquecimento terminar; `limiter.js` aplica 5-10 msgs/dia com jitter |
| Dado ruim (telefone errado, empresa fechada) | `coleta/src/validar.js` normaliza e valida antes de qualquer lead entrar em `leads.csv` |
| Spam sem opt-out | `whatsapp-bot/src/optout.js` — número que responde "sair"/"parar" nunca mais recebe mensagem, checado a cada envio |
| LGPD (dado de contato de empresa) | Mensagem sempre identifica remetente (Missões Tech) e motivo; opt-out honrado é o requisito não-negociável, não decorativo |

## Fora de escopo (v1)
- Dashboard visual (Figma/Canva) — só depois do MVP provar sinal.
- Google Places API oficial — usar Vibe Prospecting + Firecrawl primeiro
  (já conectados, zero setup); Places entra se a cobertura B2B não for
  suficiente pro nicho piloto.
- Qualquer envio fora do rate-limit definido, mesmo que o diretor peça
  "só hoje" — regra de código, não de prompt.
