import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ESTADO = 'whatsapp-bot/state/warmup.json';
const DIAS_MINIMOS = 6; // decisão do diretor: 5-7 dias, uso humano normal antes do 1º disparo automatizado

function carregar() {
  if (!existsSync(ESTADO)) return null;
  return JSON.parse(readFileSync(ESTADO, 'utf8'));
}

// Chamado 1x, manualmente, quando o diretor começa a usar o número
// normalmente (entrar em grupo, mandar mensagem). Idempotente.
export function iniciarAquecimento() {
  mkdirSync('whatsapp-bot/state', { recursive: true });
  const existente = carregar();
  if (existente) return existente;
  const estado = { inicio: new Date().toISOString() };
  writeFileSync(ESTADO, JSON.stringify(estado, null, 2));
  return estado;
}

export function statusAquecimento() {
  const estado = carregar();
  if (!estado) return { ativo: false, concluido: false, diasRestantes: DIAS_MINIMOS };
  const diasPassados = (Date.now() - new Date(estado.inicio).getTime()) / 86_400_000;
  const diasRestantes = Math.max(0, Math.ceil(DIAS_MINIMOS - diasPassados));
  return { ativo: true, concluido: diasPassados >= DIAS_MINIMOS, diasRestantes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const comando = process.argv[2];
  if (comando === 'iniciar') {
    console.log('[warmup] iniciado:', iniciarAquecimento());
  } else {
    console.log('[warmup] status:', statusAquecimento());
  }
}
