import { describe, it, expect } from 'vitest';
import { mapearColunas, normalizarLinhasPlanilha } from './mapeamento-colunas.js';

describe('mapearColunas', () => {
  it('reconhece cabeçalho padrão', () => {
    const { mapeamento, valido } = mapearColunas(['nome', 'telefone', 'categoria', 'cidade']);
    expect(mapeamento.nome).toEqual(['nome']);
    expect(mapeamento.telefone).toEqual(['telefone']);
    expect(valido).toBe(true);
  });

  it('reconhece variação em português com acento e sinônimo', () => {
    const { mapeamento, valido } = mapearColunas(['Razão Social', 'Celular', 'Município', 'Segmento']);
    expect(mapeamento.nome).toEqual(['Razão Social']);
    expect(mapeamento.telefone).toEqual(['Celular']);
    expect(mapeamento.cidade).toEqual(['Município']);
    expect(mapeamento.categoria).toEqual(['Segmento']);
    expect(valido).toBe(true);
  });

  it('reconhece WhatsApp como telefone', () => {
    const { mapeamento } = mapearColunas(['Empresa', 'WhatsApp']);
    expect(mapeamento.telefone).toEqual(['WhatsApp']);
  });

  it('junta DUAS colunas candidatas a telefone (Celular e WhatsApp) em vez de descartar uma', () => {
    const { mapeamento } = mapearColunas(['Empresa', 'Celular', 'WhatsApp']);
    expect(mapeamento.telefone).toEqual(['Celular', 'WhatsApp']);
  });

  it('marca inválido quando falta campo obrigatório (telefone)', () => {
    const { valido, faltando } = mapearColunas(['Nome Fantasia', 'Cidade']);
    expect(valido).toBe(false);
    expect(faltando).toContain('telefone');
  });

  it('lista coluna que não bateu em nada, não mapeia no escuro', () => {
    const { naoMapeados } = mapearColunas(['nome', 'telefone', 'observações internas']);
    expect(naoMapeados).toEqual(['observações internas']);
  });

  it('não mapeia a mesma coluna pra dois campos diferentes', () => {
    const { mapeamento } = mapearColunas(['nome', 'telefone']);
    const todosCandidatos = Object.values(mapeamento).flat();
    expect(new Set(todosCandidatos).size).toBe(todosCandidatos.length);
  });
});

describe('normalizarLinhasPlanilha', () => {
  it('remapeia linha crua pro schema canônico', () => {
    const linhas = [{ 'Razão Social': 'Padaria do João', Celular: '27999998888' }];
    const [resultado] = normalizarLinhasPlanilha(linhas, { nome: ['Razão Social'], telefone: ['Celular'] });
    expect(resultado).toMatchObject({
      nome: 'Padaria do João',
      telefone: '27999998888',
      fonte: 'manual-upload',
    });
  });

  it('usa o segundo candidato quando o primeiro está vazio NAQUELA linha (o bug real que apareceu no teste)', () => {
    const linhas = [
      { Empresa: 'Padaria Pão Quente', Celular: '27999112233', WhatsApp: '' },
      { Empresa: 'Salão Beleza Rara', Celular: '', WhatsApp: '27988776655' },
    ];
    const mapeamento = { nome: ['Empresa'], telefone: ['Celular', 'WhatsApp'] };
    const resultado = normalizarLinhasPlanilha(linhas, mapeamento);
    expect(resultado[0].telefone).toBe('27999112233');
    expect(resultado[1].telefone).toBe('27988776655'); // não fica vazio só porque Celular tava em branco
  });
});
