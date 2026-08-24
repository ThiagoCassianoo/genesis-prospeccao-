import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Limitador diário genérico — mesma lógica pro rate-limit do WhatsApp
// (whatsapp-bot/src/limiter.js) e do navegador (coleta/src/limiter-navegador.js).
// Uma implementação só, dois usos, cada um com seu teto/janela/intervalo
// e seu próprio arquivo de estado — travar isso em código, não em
// prompt, é o que faz a trava valer de verdade.
export function criarLimitadorDiario({
  arquivoEstado,
  limiteMin,
  limiteMax,
  horaInicio = 9,
  horaFim = 19,
  intervaloMinMs,
  intervaloMaxMs,
}) {
  function hoje() {
    return new Date().toISOString().slice(0, 10);
  }

  function carregar() {
    mkdirSync(dirname(arquivoEstado), { recursive: true });
    if (!existsSync(arquivoEstado)) return null;
    return JSON.parse(readFileSync(arquivoEstado, 'utf8'));
  }

  function salvar(estado) {
    writeFileSync(arquivoEstado, JSON.stringify(estado, null, 2));
  }

  // Sorteia o teto do dia uma única vez por dia — volume idêntico todo
  // dia é a assinatura mais óbvia de bot.
  function estadoDoDia() {
    let estado = carregar();
    if (!estado || estado.data !== hoje()) {
      estado = {
        data: hoje(),
        limiteHoje: limiteMin + Math.floor(Math.random() * (limiteMax - limiteMin + 1)),
        executados: 0,
      };
      salvar(estado);
    }
    return estado;
  }

  return {
    podeExecutarAgora() {
      const horaAtual = new Date().getHours();
      if (horaAtual < horaInicio || horaAtual >= horaFim) {
        return { pode: false, motivo: `fora do horário permitido (${horaInicio}h-${horaFim}h)` };
      }
      const estado = estadoDoDia();
      if (estado.executados >= estado.limiteHoje) {
        return { pode: false, motivo: `limite diário atingido (${estado.executados}/${estado.limiteHoje})` };
      }
      return { pode: true, restantesHoje: estado.limiteHoje - estado.executados };
    },
    registrarExecucao() {
      const estado = estadoDoDia();
      estado.executados += 1;
      salvar(estado);
      return estado;
    },
    proximoIntervaloMs() {
      return intervaloMinMs + Math.floor(Math.random() * (intervaloMaxMs - intervaloMinMs));
    },
  };
}
