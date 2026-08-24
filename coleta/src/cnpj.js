// Enriquecimento via BrasilAPI — API pública oficial (dados da Receita
// Federal), sem chave, sem cadastro. Usada pra confirmar que a empresa
// tá ATIVA antes de gastar uma mensagem nela — é o filtro mais barato
// que existe contra "empresa fechada" no leads.csv.
const BASE_URL = 'https://brasilapi.com.br/api/cnpj/v1';

export async function consultarCNPJ(cnpj) {
  const limpo = String(cnpj).replace(/\D/g, '');
  if (limpo.length !== 14) return null;

  const resposta = await fetch(`${BASE_URL}/${limpo}`);
  if (!resposta.ok) return null; // 404 = CNPJ não encontrado, 429 = rate limit da API pública

  const dado = await resposta.json();
  return {
    razao_social: dado.razao_social,
    situacao: dado.descricao_situacao_cadastral, // 'ATIVA', 'BAIXADA', 'SUSPENSA'...
    ativa: dado.descricao_situacao_cadastral === 'ATIVA',
    telefone: dado.ddd_telefone_1 || null,
    cnae_principal: dado.cnae_fiscal_descricao,
    municipio: dado.municipio,
    uf: dado.uf,
  };
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
