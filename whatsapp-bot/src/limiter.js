import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ESTADO = 'whatsapp-bot/state/limiter.json';
const LIMITE_MIN = 5;
const LIMITE_MAX = 10; // decisão do diretor: 5-10 msgs/dia
const HORA_INICIO = 9;
const HORA_FIM = 19;
const INTERVALO_MIN_MS = 4 * 60_000;
const INTERVALO_MAX_MS = 22 * 60_000; // 4-22min entre envios, jitter humano

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function carregar() {
  mkdirSync('whatsapp-bot/state', { recursive: true });
  if (!existsSync(ESTADO)) return null;
  return JSON.parse(readFileSync(ESTADO, 'utf8'));
}

function salvar(estado) {
  writeFileSync(ESTADO, JSON.stringify(estado, null, 2));
}

// Sorteia o teto do dia uma única vez por dia (não fixo em 10 sempre —
// varia o padrão de disparo, characteristic de bot é volume idêntico
// todo dia).
function estadoDoDia() {
  let estado = carregar();
  if (!estado || estado.data !== hoje()) {
    estado = {
      data: hoje(),
      limiteHoje: LIMITE_MIN + Math.floor(Math.random() * (LIMITE_MAX - LIMITE_MIN + 1)),
      enviados: 0,
    };
    salvar(estado);
  }
  return estado;
}

export function podeEnviarAgora() {
  const horaAtual = new Date().getHours();
  if (horaAtual < HORA_INICIO || horaAtual >= HORA_FIM) {
    return { pode: false, motivo: 'fora do horário comercial (9h-19h)' };
  }
  const estado = estadoDoDia();
  if (estado.enviados >= estado.limiteHoje) {
    return { pode: false, motivo: `limite diário atingido (${estado.enviados}/${estado.limiteHoje})` };
  }
  return { pode: true, restantesHoje: estado.limiteHoje - estado.enviados };
}

export function registrarEnvio() {
  const estado = estadoDoDia();
  estado.enviados += 1;
  salvar(estado);
  return estado;
}

export function proximoIntervaloMs() {
  return INTERVALO_MIN_MS + Math.floor(Math.random() * (INTERVALO_MAX_MS - INTERVALO_MIN_MS));
}
