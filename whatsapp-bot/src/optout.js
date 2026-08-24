import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ESTADO = 'whatsapp-bot/state/optout.json';
const PADRAO_OPTOUT = /\b(parar|sair|descadastrar|descadastre|remover|n[ãa]o quero|stop)\b/i;

function carregar() {
  mkdirSync('whatsapp-bot/state', { recursive: true });
  if (!existsSync(ESTADO)) return [];
  return JSON.parse(readFileSync(ESTADO, 'utf8'));
}

export function detectarPedidoOptOut(textoRecebido) {
  return PADRAO_OPTOUT.test(textoRecebido ?? '');
}

export function estaOptOut(telefoneE164) {
  return carregar().includes(telefoneE164);
}

export function registrarOptOut(telefoneE164) {
  const lista = carregar();
  if (!lista.includes(telefoneE164)) {
    lista.push(telefoneE164);
    writeFileSync(ESTADO, JSON.stringify(lista, null, 2));
  }
}
