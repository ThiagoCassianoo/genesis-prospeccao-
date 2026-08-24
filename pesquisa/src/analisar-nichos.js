import { writeFileSync, mkdirSync } from 'node:fs';
import { buscarEmpresas } from '../../coleta/src/maps.js';

// Núcleo puro — testável sem rede. Recebe já os resultados de busca por
// nicho e calcula o sinal de oportunidade: quanto mais empresas
// encontradas E maior a fração sem site, mais forte o sinal de que
// aquele nicho precisa da oferta da Missões Tech.
export function pontuarNichos(resultadosPorNicho) {
  return Object.entries(resultadosPorNicho)
    .map(([nicho, empresas]) => {
      const total = empresas.length;
      const semSite = empresas.filter((e) => !e.site).length;
      const percentualSemSite = total ? semSite / total : 0;
      return {
        nicho,
        total,
        semSite,
        percentualSemSite: Math.round(percentualSemSite * 100),
        // score simples e auditável: densidade × carência de site.
        // Não é ML — é a mesma lógica de calcularPrioridade() do
        // validar.js, aplicada no nível de nicho em vez de lead.
        score: total * percentualSemSite,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function gerarRelatorio(ranking, cidade) {
  const linhas = ranking
    .map(
      (r, i) =>
        `${i + 1}. **${r.nicho}** — ${r.total} encontrados, ${r.semSite} sem site (${r.percentualSemSite}%), score ${r.score}`
    )
    .join('\n');
  return `# Pesquisa de nicho — ${cidade}\n\nGerado por \`pesquisa/src/analisar-nichos.js\` a partir de busca real (não estimativa).\n\n${linhas}\n\n## Como ler\nScore = quantidade encontrada × % sem site. Nicho no topo é o que tem\nmais empresas achável E mais carência de presença digital ao mesmo\ntempo — não o mais numeroso sozinho, não o mais carente sozinho.\n\n## Próximo passo\nO nicho #1 vira o piloto do MVP (\`docs/brief.md\`, escopo de 30 leads).\n`;
}

// CLI: node pesquisa/src/analisar-nichos.js "Serra, ES" "clínica odontológica" "barbearia" "pet shop"
export async function rodarAnalise(cidade, nichos) {
  const resultadosPorNicho = {};
  for (const nicho of nichos) {
    try {
      resultadosPorNicho[nicho] = await buscarEmpresas(nicho, cidade);
    } catch (erro) {
      console.error(`[pesquisa] falhou pra "${nicho}":`, erro.message);
      resultadosPorNicho[nicho] = [];
    }
  }
  const ranking = pontuarNichos(resultadosPorNicho);
  mkdirSync('pesquisa', { recursive: true });
  const slug = cidade.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const caminho = `pesquisa/relatorio-${slug}.md`;
  writeFileSync(caminho, gerarRelatorio(ranking, cidade));
  console.log(`[pesquisa] ${caminho} gerado. Nicho #1: ${ranking[0]?.nicho ?? 'nenhum resultado'}`);
  return ranking;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cidade, ...nichos] = process.argv.slice(2);
  if (!cidade || nichos.length === 0) {
    console.error('uso: node pesquisa/src/analisar-nichos.js "<cidade>" "<nicho1>" "<nicho2>" ...');
    process.exit(1);
  }
  rodarAnalise(cidade, nichos);
}
