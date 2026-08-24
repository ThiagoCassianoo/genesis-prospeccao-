import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { normalizarTelefoneBR } from './telefone.js';
import { buscarWhatsAppNoSite } from './whatsapp-publico.js';

const COLUNAS_SAIDA = ['nome', 'telefone_e164', 'categoria', 'cidade', 'site', 'fonte', 'prioridade', 'status'];

// Pontuação de prioridade — regra do ICP já definido em docs/brief.md:
// empresa sem site é o sinal mais forte de que precisa da oferta da
// Missões Tech. Não é ML, é a mesma regra de negócio, só que aplicada
// de forma consistente em vez de na cabeça.
function calcularPrioridade(lead) {
  return lead.site ? 'media' : 'alta';
}

function carregarExistentes(caminho) {
  if (!existsSync(caminho)) return [];
  return parse(readFileSync(caminho, 'utf8'), { columns: true, skip_empty_lines: true });
}

// Núcleo puro (records in, records out) — usado tanto pelo CLI quanto
// pelo painel web, pra não ter duas implementações da mesma regra de
// dedupe/validação.
export async function validarLeadsDeRegistros(entrada, caminhoSaida = 'coleta/leads.csv') {
  const existentes = carregarExistentes(caminhoSaida);
  const telefonesVistos = new Set(existentes.map((l) => l.telefone_e164).filter(Boolean));

  const novas = [];
  for (const linha of entrada) {
    const prioridade = calcularPrioridade(linha);
    let telefone_e164 = normalizarTelefoneBR(linha.telefone);
    let fonte = linha.fonte;

    // Sem telefone válido, mas tem site? Tenta resgatar pelo wa.me que
    // a própria empresa publicou — dado público mais confiável que
    // CNPJ, antes de descartar o lead como inválido.
    if (!telefone_e164 && linha.site) {
      const doSite = await buscarWhatsAppNoSite(linha.site);
      if (doSite) {
        telefone_e164 = doSite;
        fonte = `${linha.fonte}+wa.me`;
      }
    }

    if (!telefone_e164) {
      novas.push({ ...linha, telefone_e164: linha.telefone ?? '', prioridade, status: 'invalido' });
      continue;
    }
    if (telefonesVistos.has(telefone_e164)) {
      novas.push({ ...linha, telefone_e164, fonte, prioridade, status: 'duplicado' });
      continue;
    }
    telefonesVistos.add(telefone_e164);
    novas.push({ ...linha, telefone_e164, fonte, prioridade, status: 'pendente' });
  }

  novas.sort((a, b) => (a.prioridade === b.prioridade ? 0 : a.prioridade === 'alta' ? -1 : 1));

  const todas = [...existentes, ...novas];
  mkdirSync('coleta', { recursive: true });
  writeFileSync(caminhoSaida, stringify(todas, { header: true, columns: COLUNAS_SAIDA }));

  const resumo = {
    total: novas.length,
    pendente: novas.filter((l) => l.status === 'pendente').length,
    invalido: novas.filter((l) => l.status === 'invalido').length,
    duplicado: novas.filter((l) => l.status === 'duplicado').length,
  };
  return resumo;
}

export async function validarLeads(caminhoEntrada, caminhoSaida = 'coleta/leads.csv') {
  const entrada = parse(readFileSync(caminhoEntrada, 'utf8'), { columns: true, skip_empty_lines: true });
  const resumo = await validarLeadsDeRegistros(entrada, caminhoSaida);
  console.log(`[coleta] ${caminhoEntrada} -> ${caminhoSaida}:`, resumo);
  return resumo;
}

// CLI: node coleta/src/validar.js <arquivo-entrada.csv>
if (import.meta.url === `file://${process.argv[1]}`) {
  const arquivo = process.argv[2];
  if (!arquivo) {
    console.error('uso: node coleta/src/validar.js <arquivo-entrada.csv>');
    process.exit(1);
  }
  validarLeads(arquivo).catch((e) => {
    console.error('[coleta] erro:', e.message);
    process.exit(1);
  });
}
