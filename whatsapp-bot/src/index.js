import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { statusAquecimento } from './warmup.js';
import { podeEnviarAgora, registrarEnvio, proximoIntervaloMs } from './limiter.js';
import { detectarPedidoOptOut, estaOptOut, registrarOptOut } from './optout.js';
import { montarMensagem } from './templates.js';
import { atualizarEstagio } from '../../crm/src/sync-twenty.js';

const LEADS_CSV = 'coleta/leads.csv';
const LOG_ENVIOS = 'whatsapp-bot/state/enviados.csv';

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function lerLeadsPendentes() {
  if (!existsSync(LEADS_CSV)) return [];
  const linhas = parse(readFileSync(LEADS_CSV, 'utf8'), { columns: true, skip_empty_lines: true });
  return linhas.filter((l) => l.status === 'pendente' && !estaOptOut(l.telefone_e164));
}

function marcarComoEnviado(telefoneE164) {
  const linhas = parse(readFileSync(LEADS_CSV, 'utf8'), { columns: true, skip_empty_lines: true });
  const atualizadas = linhas.map((l) =>
    l.telefone_e164 === telefoneE164 ? { ...l, status: 'enviado' } : l
  );
  const header = Object.keys(atualizadas[0] ?? {}).join(',');
  const corpo = atualizadas
    .map((l) => Object.values(l).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  writeFileSync(LEADS_CSV, `${header}\n${corpo}\n`);
}

function logarEnvio(lead, mensagem) {
  mkdirSync('whatsapp-bot/state', { recursive: true });
  if (!existsSync(LOG_ENVIOS)) {
    writeFileSync(LOG_ENVIOS, 'timestamp,nome,telefone_e164,mensagem\n');
  }
  const linha = [new Date().toISOString(), lead.nome, lead.telefone_e164, mensagem.replace(/\n/g, ' ')]
    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
    .join(',');
  appendFileSync(LOG_ENVIOS, `${linha}\n`);
}

// Roda a campanha: pega leads pendentes, respeita aquecimento + rate
// limit + horário comercial, envia um por vez com intervalo aleatório.
// Nunca ignora um bloqueio — se o limite do dia bateu, para e sai (não
// fica em loop esperando virar o dia).
async function rodarCampanha(socket) {
  const aquecimento = statusAquecimento();
  if (!aquecimento.concluido) {
    console.log(`[campanha] aquecimento ainda ativo — faltam ${aquecimento.diasRestantes} dia(s). Nenhum disparo automatizado.`);
    return;
  }

  const leads = lerLeadsPendentes();
  if (leads.length === 0) {
    console.log('[campanha] nenhum lead pendente em coleta/leads.csv.');
    return;
  }

  for (const lead of leads) {
    const verificacao = podeEnviarAgora();
    if (!verificacao.pode) {
      console.log(`[campanha] parando: ${verificacao.motivo}.`);
      return;
    }

    const mensagem = montarMensagem(lead);
    const jid = `${lead.telefone_e164.replace('+', '')}@s.whatsapp.net`;
    await socket.sendMessage(jid, { text: mensagem });

    registrarEnvio();
    marcarComoEnviado(lead.telefone_e164);
    logarEnvio(lead, mensagem);
    await atualizarEstagio(lead.telefone_e164, 'CONTATADO').catch((erro) =>
      console.error('[crm] falhou ao mover estágio (kanban segue manual pra esse lead):', erro.message)
    );
    console.log(`[campanha] enviado pra ${lead.nome} (${verificacao.restantesHoje - 1} restantes hoje).`);

    await esperar(proximoIntervaloMs());
  }
}

async function iniciar() {
  const { state, saveCreds } = await useMultiFileAuthState('whatsapp-bot/state/auth');
  const socket = makeWASocket({ auth: state, printQRInTerminal: false });

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('[bot] escaneie o QR code com o WhatsApp do número novo:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      console.log('[bot] conectado. Iniciando campanha...');
      rodarCampanha(socket).catch((erro) => console.error('[campanha] erro:', erro));
    }
    if (connection === 'close') {
      const deveReconectar =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[bot] conexão fechada.', deveReconectar ? 'Reconectando...' : 'Deslogado — apague whatsapp-bot/state/auth e escaneie de novo.');
      if (deveReconectar) iniciar();
    }
  });

  // Opt-out tem prioridade sobre qualquer outra lógica — checa toda
  // mensagem recebida, independente de vir de lead da campanha ou não.
  // Fecha o funil que faltava: qualquer resposta que NÃO seja opt-out
  // move o card no CRM pra "respondeu" sozinho — é o kanban andando
  // pelo evento real, não pelo diretor arrastando manualmente.
  socket.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const texto = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? '';
      const telefone = `+${msg.key.remoteJid.replace('@s.whatsapp.net', '')}`;

      if (detectarPedidoOptOut(texto)) {
        registrarOptOut(telefone);
        console.log(`[optout] ${telefone} pediu pra parar — nunca mais recebe mensagem.`);
        continue;
      }

      atualizarEstagio(telefone, 'RESPONDEU')
        .then((r) => r && console.log(`[crm] ${telefone} respondeu — card movido no kanban.`))
        .catch((erro) => console.error('[crm] falhou ao mover estágio:', erro.message));
    }
  });
}

iniciar().catch((erro) => console.error('[bot] falha ao iniciar:', erro));
