import { describe, it, expect } from 'vitest';
import { pontuarNichos } from './analisar-nichos.js';

describe('pontuarNichos', () => {
  it('prioriza nicho com mais volume E mais carência de site, não só um dos dois', () => {
    const resultado = pontuarNichos({
      'clínica odontológica': [{ site: '' }, { site: '' }, { site: 'x.com' }], // 3 total, 2 sem site (67%)
      barbearia: [{ site: '' }], // 1 total, 1 sem site (100%) — carência alta, volume baixo
      pet_shop: [{ site: 'x.com' }, { site: 'y.com' }], // 2 total, 0 sem site (0%)
    });

    expect(resultado[0].nicho).toBe('clínica odontológica'); // score 3*67=201 > barbearia 1*100=100
    expect(resultado.find((r) => r.nicho === 'pet_shop').score).toBe(0);
  });

  it('não quebra com nicho sem nenhum resultado', () => {
    const resultado = pontuarNichos({ nicho_vazio: [] });
    expect(resultado[0].total).toBe(0);
    expect(resultado[0].score).toBe(0);
  });
});
