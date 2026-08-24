import { criarLimitadorDiario } from '../../lib/limitador-diario.js';

// decisão do diretor: 5-10 msgs/dia, 9h-19h, 4-22min entre envios (jitter humano)
const limitador = criarLimitadorDiario({
  arquivoEstado: 'whatsapp-bot/state/limiter.json',
  limiteMin: 5,
  limiteMax: 10,
  intervaloMinMs: 4 * 60_000,
  intervaloMaxMs: 22 * 60_000,
});

export function podeEnviarAgora() {
  const r = limitador.podeExecutarAgora();
  return r.pode ? { pode: true, restantesHoje: r.restantesHoje } : r;
}
export function registrarEnvio() {
  return limitador.registrarExecucao();
}
export function proximoIntervaloMs() {
  return limitador.proximoIntervaloMs();
}
