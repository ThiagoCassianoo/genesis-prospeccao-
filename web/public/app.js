async function chamarAPI(rota, opcoes) {
  const resposta = await fetch(rota, opcoes);
  return resposta.json();
}

document.getElementById('form-varredura').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const dados = Object.fromEntries(new FormData(ev.target));
  const saida = document.getElementById('resultado-varredura');
  saida.textContent = 'Buscando...';
  const r = await chamarAPI('/api/varredura', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  saida.textContent = r.erro
    ? `Erro: ${r.erro}`
    : `${r.encontrados} encontrados — ${r.pendente} válidos, ${r.invalido} inválidos, ${r.duplicado} duplicados.`;
  carregarLeads();
});

document.getElementById('form-importar').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const saida = document.getElementById('resultado-importar');
  saida.textContent = 'Lendo e reconhecendo colunas...';
  const resposta = await fetch('/api/importar', { method: 'POST', body: new FormData(ev.target) });
  const r = await resposta.json();
  saida.textContent = r.erro
    ? `Erro: ${r.erro}`
    : `Coluna reconhecida: ${JSON.stringify(r.mapeamento)}\n` +
      (r.naoMapeados.length ? `Não reconhecida (ignorada): ${r.naoMapeados.join(', ')}\n` : '') +
      `${r.linhasLidas} linhas lidas — ${r.validacao.pendente} válidas, ${r.validacao.invalido} inválidas, ${r.validacao.duplicado} duplicadas.` +
      (r.crm ? `\nCRM: ${r.crm.criadas} nova(s) sincronizada(s).` : '\nCRM não configurado — só validou.');
  carregarLeads();
});

async function carregarLeads() {
  const leads = await chamarAPI('/api/leads');
  const corpo = document.querySelector('#tabela-leads tbody');
  corpo.innerHTML = leads
    .map(
      (l) =>
        `<tr><td>${l.nome}</td><td>${l.telefone_e164}</td><td>${l.categoria || ''}</td><td>${l.site || '—'}</td><td>${l.prioridade || ''}</td><td>${l.status}</td></tr>`
    )
    .join('');
}
document.getElementById('btn-atualizar-leads').addEventListener('click', carregarLeads);

async function carregarStatus() {
  const r = await chamarAPI('/api/status');
  const div = document.getElementById('status-whatsapp');
  div.innerHTML = r.aquecimento.concluido
    ? `✅ Aquecimento concluído. ${r.envioHoje.pode ? `Pode enviar hoje (${r.envioHoje.restantesHoje} restantes).` : `Bloqueado agora: ${r.envioHoje.motivo}.`}`
    : `🔥 Aquecendo — faltam ${r.aquecimento.diasRestantes} dia(s) antes do 1º disparo automatizado.`;
}
document.getElementById('btn-iniciar-aquecimento').addEventListener('click', async () => {
  await chamarAPI('/api/aquecimento/iniciar', { method: 'POST' });
  carregarStatus();
});

document.getElementById('form-cnpj').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const { cnpj } = Object.fromEntries(new FormData(ev.target));
  const saida = document.getElementById('resultado-cnpj');
  saida.textContent = 'Consultando...';
  const r = await chamarAPI('/api/cnpj', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cnpj }),
  });
  saida.textContent = r.erro ? `Erro: ${r.erro}` : JSON.stringify(r, null, 2);
});

carregarLeads();
carregarStatus();
