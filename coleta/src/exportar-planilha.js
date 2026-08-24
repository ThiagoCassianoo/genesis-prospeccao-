// Consolida coleta/leads.csv numa planilha .xlsx estruturada — o
// "cruzamento de dados" pedido: quando a linha tem CNPJ preenchido,
// cruza com a situação cadastral real (BrasilAPI/CNPJ.ws) antes de
// exportar. Duas abas: Leads (tabela completa) e Resumo (contagem por
// status/prioridade/fonte) — não é só um dump de CSV renomeado.

import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import xlsx from 'xlsx';
import { consultarCNPJ } from './cnpj.js';

async function cruzarComCNPJ(leads) {
  const cruzados = [];
  for (const lead of leads) {
    if (!lead.cnpj) {
      cruzados.push({ ...lead, situacao_cnpj: '', razao_social_cnpj: '' });
      continue;
    }
    const dado = await consultarCNPJ(lead.cnpj).catch(() => null);
    cruzados.push({
      ...lead,
      situacao_cnpj: dado?.situacao ?? 'não encontrado',
      razao_social_cnpj: dado?.razao_social ?? '',
    });
  }
  return cruzados;
}

function montarResumo(leads) {
  const contar = (campo) =>
    Object.entries(
      leads.reduce((acc, l) => ({ ...acc, [l[campo]]: (acc[l[campo]] ?? 0) + 1 }), {})
    ).map(([valor, total]) => ({ [campo]: valor, total }));

  return [
    { metrica: 'Total de leads', valor: leads.length },
    { metrica: '—', valor: '—' },
    ...contar('status').map((r) => ({ metrica: `status: ${r.status}`, valor: r.total })),
    { metrica: '—', valor: '—' },
    ...contar('prioridade').map((r) => ({ metrica: `prioridade: ${r.prioridade}`, valor: r.total })),
    { metrica: '—', valor: '—' },
    ...contar('fonte').map((r) => ({ metrica: `fonte: ${r.fonte}`, valor: r.total })),
  ];
}

export async function exportarPlanilha(caminhoLeads = 'coleta/leads.csv', caminhoSaida) {
  if (!existsSync(caminhoLeads)) throw new Error(`${caminhoLeads} não existe — rode a coleta primeiro.`);

  const leads = parse(readFileSync(caminhoLeads, 'utf8'), { columns: true, skip_empty_lines: true });
  const cruzados = await cruzarComCNPJ(leads);

  const livro = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(livro, xlsx.utils.json_to_sheet(cruzados), 'Leads');
  xlsx.utils.book_append_sheet(livro, xlsx.utils.json_to_sheet(montarResumo(leads)), 'Resumo');

  const destino = caminhoSaida ?? `coleta/planilhas/leads-${Date.now()}.xlsx`;
  mkdirSync('coleta/planilhas', { recursive: true });
  xlsx.writeFile(livro, destino);
  console.log(`[exportar] ${destino} gerado (${leads.length} leads).`);
  return destino;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  exportarPlanilha().catch((e) => {
    console.error('[exportar] erro:', e.message);
    process.exit(1);
  });
}
