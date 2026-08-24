import { describe, it, expect } from 'vitest';
import { detectarPedidoOptOut } from './optout.js';

describe('detectarPedidoOptOut', () => {
  it('detecta pedido explícito de parar', () => {
    expect(detectarPedidoOptOut('para de mandar mensagem, quero parar')).toBe(true);
  });
  it('detecta "sair" e "stop"', () => {
    expect(detectarPedidoOptOut('sair')).toBe(true);
    expect(detectarPedidoOptOut('STOP')).toBe(true);
  });
  it('não sinaliza mensagem normal', () => {
    expect(detectarPedidoOptOut('oi, qual o preço do site?')).toBe(false);
  });
});
