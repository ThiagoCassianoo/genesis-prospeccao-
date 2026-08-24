import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { normalizarTelefoneBR } from './telefone.js';

const COLUNAS_SAIDA = ['nome', 'telefone_e164', 'categoria', 'cidade', 'site', 'fonte', 'status'];

function carregarExistentes(caminho) {
  if (!existsSync(caminho)) return [];
  return parse(readFileSync(caminho, 'utf8'), { columns: true, skip_empty_lines: true });
}

// Núcleo puro (records in, records out) — usado tanto pelo CLI quanto
// pelo painel web, pra não ter duas implementações da mesma regra de
// dedupe/validação.
export function validarLeadsDeRegistros(entrada, caminhoSaida = 'coleta/leads.csv') {
  const existentes = carregarExistentes(caminhoSaida);
  const telefonesVistos = new Set(existentes.map((l) => l.telefone_e164).filter(Boolean));

  const novas = [];
  for (const linha of entrada) {
    const telefone_e164 = normalizarTelefoneBR(linha.telefone);
    if (!telefone_e164) {
      novas.push({ ...linha, telefone_e164: linha.telefone ?? '', status: 'invalido' });
      continue;
    }
    if (telefonesVistos.has(telefone_e164)) {
      novas.push({ ...linha, telefone_e164, status: 'duplicado' });
      continue;
    }
    telefonesVistos.add(telefone_e164);
    novas.push({ ...linha, telefone_e164, status: 'pendente' });
  }

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

export function validarLeads(caminhoEntrada, caminhoSaida = 'coleta/leads.csv') {
  const entrada = parse(readFileSync(caminhoEntrada, 'utf8'), { columns: true, skip_empty_lines: true });
  const resumo = validarLeadsDeRegistros(entrada, caminhoSaida);
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
  validarLeads(arquivo);
}
