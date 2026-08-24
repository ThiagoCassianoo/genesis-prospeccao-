// Variantes pra não mandar texto idêntico pra todo mundo (padrão de spam
// óbvio). Ajuste a oferta aqui — é o único arquivo que devia mudar entre
// campanhas.
const VARIANTES = [
  ({ nome }) =>
    `Oi! Vi que a ${nome} não tem site (ou tá desatualizado) — trabalho com a Missões Tech criando sites e sistemas pra negócios como o seu. Faz sentido eu te mandar 2 exemplos rápidos?`,
  ({ nome, categoria }) =>
    `Olá, tudo bem? Sou da Missões Tech — ajudamos empresas de ${categoria || 'diversos segmentos'} a ter presença digital de verdade. Notei a ${nome} e acho que dá pra ajudar. Posso te mostrar como?`,
  ({ nome }) =>
    `Oi! Passando rápido: a Missões Tech monta sites e sistemas sob medida, e a ${nome} chamou minha atenção como um bom encaixe. Tem 2 minutos essa semana pra eu te explicar?`,
];

export function montarMensagem(lead) {
  const variante = VARIANTES[Math.floor(Math.random() * VARIANTES.length)];
  return `${variante(lead)}\n\n(Se não quiser mais receber mensagens, responda "parar".)`;
}
