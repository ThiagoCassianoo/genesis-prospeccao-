// Enriquecimento por CNPJ. Não existe API oficial da Receita Federal em
// JSON — RFB só publica dump CSV em lote. minhareceita.org, BrasilAPI e
// CNPJ.ws são serviços (o primeiro open-source) que leem essa base;
// nenhum é "a fonte oficial", os três são espelho dela. Uso principal:
// confirmar que a empresa tá ATIVA antes de gastar uma mensagem nela.
//
// NÃO usar `telefone` daqui como contato de campanha — o telefone
// cadastrado no CNPJ é, na maioria dos casos, do escritório de
// contabilidade que fez a abertura, não da empresa (achado de
// pesquisa real, não suposição). Contato de campanha vem de
// coleta/maps.js (telefone que o próprio dono cadastrou no Google/Maps).

async function viaBrasilAPI(cnpjLimpo) {
  const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
  if (!resposta.ok) return null;
  const dado = await resposta.json();
  return {
    razao_social: dado.razao_social,
    situacao: dado.descricao_situacao_cadastral,
    ativa: dado.descricao_situacao_cadastral === 'ATIVA',
    telefone_cnpj_nao_confiavel: dado.ddd_telefone_1 || null,
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
    telefone_cnpj_nao_confiavel: dado.estabelecimento?.telefone1 || null,
    cnae_principal: dado.estabelecimento?.atividade_principal?.descricao,
    municipio: dado.estabelecimento?.cidade?.nome,
    uf: dado.estabelecimento?.estado?.sigla,
    fonte: 'cnpj.ws',
  };
}

// minhareceita.org (projeto open-source cuducos/minha-receita) — banco
// de CNPJ completo servido como API pública, sem chave, sem o limite
// de 3/min do CNPJ.ws. Reuso de projeto pronto, indicado pela
// comunidade (r/brdev) como a opção livre mais robusta hoje.
async function viaMinhaReceita(cnpjLimpo) {
  const resposta = await fetch(`https://minhareceita.org/${cnpjLimpo}`);
  if (!resposta.ok) return null;
  const dado = await resposta.json();
  return {
    razao_social: dado.razao_social,
    situacao: dado.descricao_situacao_cadastral,
    ativa: dado.descricao_situacao_cadastral === 'ATIVA',
    telefone_cnpj_nao_confiavel: dado.ddd_telefone_1 || null,
    cnae_principal: dado.cnae_fiscal_descricao,
    municipio: dado.municipio,
    uf: dado.uf,
    fonte: 'minhareceita',
  };
}

export async function consultarCNPJ(cnpj) {
  const limpo = String(cnpj).replace(/\D/g, '');
  if (limpo.length !== 14) return null;

  // minhareceita primeiro (sem rate limit apertado), BrasilAPI e
  // CNPJ.ws como fallback se ela estiver fora do ar.
  for (const consultar of [viaMinhaReceita, viaBrasilAPI, viaCnpjWs]) {
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
