// Extrai número de WhatsApp que a própria empresa publicou no site
// (link wa.me/api.whatsapp.com ou botão "fale no WhatsApp"). É dado
// público de verdade — a empresa publicou pra ser contatada — e mais
// confiável que telefone de CNPJ (que costuma ser do contador). Não é
// scraping de terceiro: é ler a própria página pública da empresa.

const PADRAO_WAME = /(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?(\d{10,15})/g;

// Núcleo puro (testável sem rede): recebe o HTML já baixado, devolve o
// número em E.164 ou null.
export function extrairNumeroWaMe(html) {
  const encontrados = [...html.matchAll(PADRAO_WAME)].map((m) => m[1]);
  if (encontrados.length === 0) return null;
  const numero = encontrados[0];
  return numero.startsWith('55') ? `+${numero}` : `+55${numero}`;
}

export async function buscarWhatsAppNoSite(site) {
  if (!site) return null;
  const url = site.startsWith('http') ? site : `https://${site}`;

  try {
    const resposta = await fetch(url, { redirect: 'follow' });
    if (!resposta.ok) return null;
    return extrairNumeroWaMe(await resposta.text());
  } catch {
    return null; // site fora do ar, timeout, CORS — segue sem essa fonte
  }
}

// CLI: node coleta/src/whatsapp-publico.js exemplo.com.br
if (import.meta.url === `file://${process.argv[1]}`) {
  const site = process.argv[2];
  if (!site) {
    console.error('uso: node coleta/src/whatsapp-publico.js <site>');
    process.exit(1);
  }
  buscarWhatsAppNoSite(site).then((r) => console.log(r ?? 'nenhum wa.me encontrado no site'));
}
