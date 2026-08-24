// Reconhecimento de coluna pra planilha de prospecção manual — o
// diretor pode subir um arquivo com cabeçalho em qualquer variação
// razoável ("Empresa", "Nome Fantasia", "Celular", "WhatsApp"...) e o
// sistema mapeia pro schema canônico sozinho.
//
// Por que heurística determinística e não ML: são ~6 campos fixos e
// bem definidos, sem dado de treino real disponível. Um classificador
// aqui seria complexidade sem benefício — o dicionário de sinônimo +
// containment é auditável (dá pra ler e saber exatamente por que bateu),
// o que importa mais que "inteligente" quando o resultado alimenta uma
// campanha de contato real.

const SINONIMOS = {
  nome: ['nome', 'empresa', 'razao social', 'nome fantasia', 'company', 'name', 'estabelecimento'],
  telefone: ['telefone', 'celular', 'whatsapp', 'fone', 'contato', 'phone', 'tel', 'numero'],
  categoria: ['categoria', 'nicho', 'segmento', 'ramo', 'atividade', 'category', 'tipo'],
  cidade: ['cidade', 'municipio', 'city', 'localidade', 'bairro', 'regiao'],
  site: ['site', 'website', 'url', 'pagina', 'homepage'],
  cnpj: ['cnpj'],
};

const CAMPOS_OBRIGATORIOS = ['nome', 'telefone'];

function normalizar(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove marca de acento (NFD separa base + diacrítico)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Recebe os cabeçalhos crus da planilha, devolve {campo: [candidatos]}
// — MAIS de uma coluna pode alimentar o mesmo campo (ex: "Celular" e
// "WhatsApp" são ambos telefone). normalizarLinhasPlanilha usa o
// primeiro candidato não-vazio por linha, não descarta o resto.
export function mapearColunas(cabecalhos) {
  const normalizados = cabecalhos.map((c) => ({ original: c, norm: normalizar(c) }));
  const usados = new Set();
  const mapeamento = {};

  for (const [campo, sinonimos] of Object.entries(SINONIMOS)) {
    const candidatosExatos = normalizados.filter(
      (c) => !usados.has(c.original) && sinonimos.includes(c.norm)
    );
    candidatosExatos.forEach((c) => usados.add(c.original));

    const candidatosParciais = normalizados.filter(
      (c) => !usados.has(c.original) && sinonimos.some((s) => c.norm.includes(s) || s.includes(c.norm))
    );
    candidatosParciais.forEach((c) => usados.add(c.original));

    const candidatos = [...candidatosExatos, ...candidatosParciais].map((c) => c.original);
    if (candidatos.length > 0) mapeamento[campo] = candidatos;
  }

  const naoMapeados = cabecalhos.filter((c) => !usados.has(c));
  const faltando = CAMPOS_OBRIGATORIOS.filter((c) => !mapeamento[c]);

  return { mapeamento, naoMapeados, faltando, valido: faltando.length === 0 };
}

// Aplica o mapeamento nas linhas cruas -> schema canônico. Por campo,
// usa o primeiro candidato com valor não-vazio naquela linha
// específica — cobre o caso real de planilha com "Celular" vazio mas
// "WhatsApp" preenchido (ou vice-versa) linha a linha.
export function normalizarLinhasPlanilha(linhas, mapeamento) {
  const primeiroValorNaoVazio = (linha, candidatos) => {
    for (const coluna of candidatos ?? []) {
      const valor = linha[coluna];
      if (valor !== undefined && valor !== null && String(valor).trim() !== '') return valor;
    }
    return '';
  };

  return linhas.map((linha) => ({
    nome: primeiroValorNaoVazio(linha, mapeamento.nome),
    telefone: primeiroValorNaoVazio(linha, mapeamento.telefone),
    categoria: primeiroValorNaoVazio(linha, mapeamento.categoria),
    cidade: primeiroValorNaoVazio(linha, mapeamento.cidade),
    site: primeiroValorNaoVazio(linha, mapeamento.site),
    cnpj: primeiroValorNaoVazio(linha, mapeamento.cnpj),
    fonte: 'manual-upload',
  }));
}
