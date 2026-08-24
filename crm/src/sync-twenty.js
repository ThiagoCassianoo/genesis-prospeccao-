// CRM com kanban automático — módulo 2. Cria company + opportunity no
// Twenty na 1ª sincronização, e move a oportunidade de estágio sozinha
// conforme o lead avança no funil (enviado -> respondeu), sem o
// diretor precisar arrastar card manualmente pros estágios que o
// pipeline já sabe detectar.
//
// Flexível de propósito: nome de estágio é configurável por env var —
// cada workspace do Twenty pode nomear o pipeline diferente, travar um
// valor no código seria inventar dado que pode não bater com a sua
// instância. Endpoint baseado na documentação pública do Twenty, não
// testado ao vivo (ver crm/README.md).

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { readFileSync as lerCSV, existsSync as existeArquivo } from 'node:fs';
import { parse } from 'csv-parse/sync';

const API_URL = process.env.TWENTY_API_URL; // ex: https://crm.seudominio.com/rest
const API_KEY = process.env.TWENTY_API_KEY;
const CAMPO_ESTAGIO = process.env.TWENTY_STAGE_FIELD || 'stage';

// Nomes de estágio do funil — ajuste pra bater com o pipeline real da
// sua instância (Configurações → Oportunidades → estágios).
const ESTAGIOS = {
  NOVO: process.env.TWENTY_STAGE_NOVO || 'NEW',
  CONTATADO: process.env.TWENTY_STAGE_CONTATADO || 'CONTACTED',
  RESPONDEU: process.env.TWENTY_STAGE_RESPONDEU || 'MEETING',
};

const ARQUIVO_ESTADO = 'crm/state/twenty-ids.json';

function exigirConfig() {
  if (!API_URL || !API_KEY) {
    throw new Error('defina TWENTY_API_URL e TWENTY_API_KEY no .env (ver crm/README.md)');
  }
}

function carregarEstado() {
  mkdirSync('crm/state', { recursive: true });
  if (!existsSync(ARQUIVO_ESTADO)) return {};
  return JSON.parse(readFileSync(ARQUIVO_ESTADO, 'utf8'));
}

function salvarEstado(estado) {
  writeFileSync(ARQUIVO_ESTADO, JSON.stringify(estado, null, 2));
}

async function chamarTwenty(metodo, caminho, corpo) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!resposta.ok) throw new Error(`Twenty ${metodo} ${caminho} -> ${resposta.status}: ${await resposta.text()}`);
  return resposta.json();
}

function leadsSincronizaveis(caminhoLeads) {
  if (!existeArquivo(caminhoLeads)) return [];
  const linhas = parse(lerCSV(caminhoLeads, 'utf8'), { columns: true, skip_empty_lines: true });
  return linhas.filter((l) => l.status === 'pendente' || l.status === 'enviado');
}

// 1ª sincronização de um lead: cria company + opportunity em estágio
// NOVO, registra o par de IDs — chamadas seguintes usam esse registro
// pra mover de estágio em vez de duplicar.
async function criarNoCRM(lead, estado) {
  const company = await chamarTwenty('POST', '/companies', {
    name: lead.nome,
    domainName: lead.site || undefined,
    address: lead.cidade ? { addressCity: lead.cidade, addressCountry: 'BR' } : undefined,
  });
  const companyId = company.data?.createCompany?.id ?? company.id;

  const opportunity = await chamarTwenty('POST', '/opportunities', {
    name: `${lead.nome} — prospecção`,
    companyId,
    [CAMPO_ESTAGIO]: ESTAGIOS.NOVO,
  });
  const opportunityId = opportunity.data?.createOpportunity?.id ?? opportunity.id;

  estado[lead.telefone_e164] = { companyId, opportunityId, estagio: ESTAGIOS.NOVO };
  return estado[lead.telefone_e164];
}

export async function sincronizarComTwenty(caminhoLeads = 'coleta/leads.csv') {
  exigirConfig();
  const leads = leadsSincronizaveis(caminhoLeads);
  const estado = carregarEstado();
  const resultado = { criadas: 0, jaExistiam: 0, falhas: 0, erros: [] };

  for (const lead of leads) {
    if (estado[lead.telefone_e164]) {
      resultado.jaExistiam += 1;
      continue;
    }
    try {
      await criarNoCRM(lead, estado);
      resultado.criadas += 1;
    } catch (erro) {
      resultado.falhas += 1;
      resultado.erros.push({ lead: lead.nome, erro: erro.message });
    }
  }

  salvarEstado(estado);
  console.log(`[crm] ${resultado.criadas} nova(s), ${resultado.jaExistiam} já sincronizada(s), ${resultado.falhas} falha(s).`);
  return resultado;
}

// Kanban automático: move a oportunidade pro próximo estágio quando o
// funil avança de verdade (mensagem enviada, resposta recebida) — quem
// chama isso é whatsapp-bot/src/index.js, não o diretor manualmente.
export async function atualizarEstagio(telefoneE164, novoEstagioChave) {
  if (!API_URL || !API_KEY) return null; // CRM não configurado — segue sem travar o resto do sistema
  const estado = carregarEstado();
  const registro = estado[telefoneE164];
  if (!registro) return null; // lead nunca foi sincronizado com o CRM — nada a mover

  const novoEstagio = ESTAGIOS[novoEstagioChave];
  if (!novoEstagio) throw new Error(`estágio desconhecido: ${novoEstagioChave}`);

  await chamarTwenty('PATCH', `/opportunities/${registro.opportunityId}`, {
    [CAMPO_ESTAGIO]: novoEstagio,
  });
  registro.estagio = novoEstagio;
  salvarEstado(estado);
  return registro;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  sincronizarComTwenty().catch((e) => {
    console.error('[crm] erro:', e.message);
    process.exit(1);
  });
}
