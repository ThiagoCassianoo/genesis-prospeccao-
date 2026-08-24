import { criarLimitadorDiario } from '../../lib/limitador-diario.js';

// decisão do diretor: até 60 números/dia via navegador, pausas
// significativas entre cliques (3-15min) — divide o teto ao longo do
// horário comercial em vez de rajada.
const limitador = criarLimitadorDiario({
  arquivoEstado: 'coleta/state/limiter-navegador.json',
  limiteMin: 30,
  limiteMax: 60,
  intervaloMinMs: 3 * 60_000,
  intervaloMaxMs: 15 * 60_000,
});

export function podeRasparAgora() {
  const r = limitador.podeExecutarAgora();
  return r.pode ? { pode: true, restantesHoje: r.restantesHoje } : r;
}
export function registrarRaspagem() {
  return limitador.registrarExecucao();
}
export function proximaPausaMs() {
  return limitador.proximoIntervaloMs();
}
