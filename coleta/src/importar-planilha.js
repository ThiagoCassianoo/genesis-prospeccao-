// Upload de planilha de prospecção manual -> reconhece coluna -> roda
// o mesmo pipeline de qualquer outra fonte (validar, priorizar,
// dedupe) -> sincroniza CRM se configurado. "Executa os agentes" no
// sentido real: os 16 agentes Claude Code só existem dentro de uma
// sessão do Claude Code, não como função chamável por um script Node
// isolado — o que este módulo automatiza é o pipeline de dado
// (validar.js + sync-twenty.js), que é o que de fato pode rodar sozinho
// fora de uma conversa com o Claude.

import xlsx from 'xlsx';
import { mapearColunas, normalizarLinhasPlanilha } from './mapeamento-colunas.js';
import { validarLeadsDeRegistros } from './validar.js';

function lerPlanilha(caminho) {
  const livro = xlsx.readFile(caminho);
  const primeiraAba = livro.SheetNames[0];
  return xlsx.utils.sheet_to_json(livro.Sheets[primeiraAba], { defval: '' });
}

export async function importarPlanilha(caminho, opcoes = {}) {
  const linhasCruas = lerPlanilha(caminho);
  if (linhasCruas.length === 0) {
    throw new Error('planilha vazia ou formato não reconhecido');
  }

  const cabecalhos = Object.keys(linhasCruas[0]);
  const { mapeamento, naoMapeados, faltando, valido } = mapearColunas(cabecalhos);

  if (!valido) {
    throw new Error(
      `não deu pra reconhecer coluna obrigatória: ${faltando.join(', ')}. ` +
        `Cabeçalhos recebidos: ${cabecalhos.join(', ')}`
    );
  }

  const linhas = normalizarLinhasPlanilha(linhasCruas, mapeamento);
  const resumoValidacao = await validarLeadsDeRegistros(linhas);

  let sincronizacaoCRM = null;
  if (opcoes.sincronizarCRM && process.env.TWENTY_API_URL && process.env.TWENTY_API_KEY) {
    const { sincronizarComTwenty } = await import('../../crm/src/sync-twenty.js');
    sincronizacaoCRM = await sincronizarComTwenty();
  }

  return {
    linhasLidas: linhasCruas.length,
    mapeamento, // transparência: mostra qual coluna virou qual campo, nunca mapeia no escuro
    naoMapeados, // colunas que não bateram em nada — o diretor decide se importa
    validacao: resumoValidacao,
    crm: sincronizacaoCRM,
  };
}

// CLI: node coleta/src/importar-planilha.js caminho/planilha.xlsx
if (import.meta.url === `file://${process.argv[1]}`) {
  const caminho = process.argv[2];
  if (!caminho) {
    console.error('uso: node coleta/src/importar-planilha.js <planilha.xlsx|.csv>');
    process.exit(1);
  }
  importarPlanilha(caminho, { sincronizarCRM: true })
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error('[importar] erro:', e.message);
      process.exit(1);
    });
}
