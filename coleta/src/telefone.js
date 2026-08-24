import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Normaliza qualquer formato BR pra E.164 (+55DDXXXXXXXXX). Retorna null
// se não for um celular BR válido — nunca lança, quem chama decide o que
// fazer com null (linha entra como 'invalido' no leads.csv).
export function normalizarTelefoneBR(bruto) {
  if (!bruto) return null;
  const limpo = String(bruto).trim();
  const comPais = limpo.startsWith('+') ? limpo : `+55${limpo.replace(/\D/g, '')}`;
  const numero = parsePhoneNumberFromString(comPais, 'BR');
  if (!numero || !numero.isValid()) return null;
  return numero.number; // E.164
}
