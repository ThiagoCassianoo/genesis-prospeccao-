// Sincroniza coleta/leads.csv -> Twenty CRM (companies), fechando o
// módulo 2 (CRM com pipeline) que faltava. Endpoint e formato baseados
// na documentação pública do Twenty (docs.twenty.com/developers/extend/api)
// — não testado ao vivo (rede do sandbox bloqueia o domínio). Confirme
// o endpoint exato da sua instância (`{TWENTY_API_URL}/rest` costuma
// expor docs interativos) antes de rodar em produção.

import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'csv-parse/sync';

const API_URL = process.env.TWENTY_API_URL; // ex: https://crm.seudominio.com/rest
const API_KEY = process.env.TWENTY_API_KEY;

function exigirConfig() {
  if (!API_URL || !API_KEY) {
    throw new Error(
      'defina TWENTY_API_URL e TWENTY_API_KEY no .env (ver crm/README.md)'
    );
  }
}

async function chamarTwenty(caminho, corpo) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) throw new Error(`Twenty ${resposta.status}: ${await resposta.text()}`);
  return resposta.json();
}

// Só sincroniza lead validado (pendente/enviado) — inválido/duplicado
// não vira empresa no CRM, seria ruído.
function leadsSincronizaveis(caminhoLeads = 'coleta/leads.csv') {
  if (!existsSync(caminhoLeads)) return [];
  const linhas = parse(readFileSync(caminhoLeads, 'utf8'), { columns: true, skip_empty_lines: true });
  return linhas.filter((l) => l.status === 'pendente' || l.status === 'enviado');
}

export async function sincronizarComTwenty(caminhoLeads = 'coleta/leads.csv') {
  exigirConfig();
  const leads = leadsSincronizaveis(caminhoLeads);
  const resultado = { criadas: 0, falhas: 0, erros: [] };

  // Batch quando o volume permite (menos chamada de API), mas segue em
  // loop simples pra não perder rastreabilidade de qual falhou.
  for (const lead of leads) {
    try {
      await chamarTwenty('/companies', {
        name: lead.nome,
        domainName: lead.site || undefined,
        address: lead.cidade ? { addressCity: lead.cidade, addressCountry: 'BR' } : undefined,
        // telefone/prioridade/fonte não são campo padrão de "company" no
        // Twenty — se sua instância tiver campo customizado pra isso,
        // adicione aqui (ex: customPhone: lead.telefone_e164).
      });
      resultado.criadas += 1;
    } catch (erro) {
      resultado.falhas += 1;
      resultado.erros.push({ lead: lead.nome, erro: erro.message });
    }
  }

  console.log(`[crm] ${resultado.criadas} empresa(s) criada(s), ${resultado.falhas} falha(s).`);
  return resultado;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  sincronizarComTwenty().catch((e) => {
    console.error('[crm] erro:', e.message);
    process.exit(1);
  });
}
