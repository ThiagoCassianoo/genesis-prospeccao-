import { describe, it, expect } from 'vitest';
import { normalizarTelefoneBR } from '../../coleta/src/telefone.js';

describe('normalizarTelefoneBR', () => {
  it('normaliza celular BR com DDD sem código do país', () => {
    expect(normalizarTelefoneBR('27999998888')).toBe('+5527999998888');
  });
  it('normaliza formatado com parênteses e traço', () => {
    expect(normalizarTelefoneBR('(27) 99999-8888')).toBe('+5527999998888');
  });
  it('retorna null pra número inválido', () => {
    expect(normalizarTelefoneBR('123')).toBeNull();
  });
  it('retorna null pra vazio', () => {
    expect(normalizarTelefoneBR('')).toBeNull();
  });
});
