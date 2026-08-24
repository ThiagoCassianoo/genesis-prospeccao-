// Enriquecimento por CNPJ. Não existe API oficial da Receita Federal em
// JSON — RFB só publica dump CSV em lote. BrasilAPI e CNPJ.ws são
// serviços terceiros que leem essa base; nenhum dos dois é "a fonte
// oficial", os dois são espelho dela. Tenta os dois, nessa ordem, antes
// de desistir — usado pra confirmar que a empresa tá ATIVA antes de
// gastar uma mensagem nela, o filtro mais barato contra "empresa
// fechada" no leads.csv.

async function viaBrasilAPI(cnpjLimpo) {
  const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
  if (!resposta.ok) return null;
  const dado = await resposta.json();
  return {
    razao_social: dado.razao_social,
    situacao: dado.descricao_situacao_cadastral,
    ativa: dado.descricao_situacao_cadastral === 'ATIVA',
    telefone: dado.ddd_telefone_1 || null,
    cnae_principal: dado.cnae_fiscal_descricao,
    municipio: dado.municipio,
    uf: dado.uf,
    fonte: 'brasilapi',
  };
}

async function viaCnpjWs(cnpjLimpo) {
  // Público, sem chave, rate limit de ~3 req/min — usar só como fallback.
  const resposta = await fetch(`https://publica.cnpj.ws/cnpj/${cnpjLimpo}`);
  if (!resposta.ok) return null;
  const dado = await resposta.json();
  return {
    razao_social: dado.razao_social,
    situacao: dado.estabelecimento?.situacao_cadastral,
    ativa: dado.estabelecimento?.situacao_cadastral === 'ATIVA',
    telefone: dado.estabelecimento?.telefone1 || null,
    cnae_principal: dado.estabelecimento?.atividade_principal?.descricao,
    municipio: dado.estabelecimento?.cidade?.nome,
    uf: dado.estabelecimento?.estado?.sigla,
    fonte: 'cnpj.ws',
  };
}

export async function consultarCNPJ(cnpj) {
  const limpo = String(cnpj).replace(/\D/g, '');
  if (limpo.length !== 14) return null;

  for (const consultar of [viaBrasilAPI, viaCnpjWs]) {
    try {
      const resultado = await consultar(limpo);
      if (resultado) return resultado;
    } catch {
      // tenta a próxima fonte
    }
  }
  return null; // nenhuma fonte respondeu — CNPJ inválido, inexistente, ou ambas fora do ar
}

// CLI: node coleta/src/cnpj.js 00000000000191
if (import.meta.url === `file://${process.argv[1]}`) {
  const cnpj = process.argv[2];
  if (!cnpj) {
    console.error('uso: node coleta/src/cnpj.js <cnpj>');
    process.exit(1);
  }
  consultarCNPJ(cnpj).then((r) => console.log(r ?? 'CNPJ não encontrado / API indisponível'));
}
