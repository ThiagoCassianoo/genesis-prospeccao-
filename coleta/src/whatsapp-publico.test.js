import { describe, it, expect } from 'vitest';
import { extrairNumeroWaMe } from './whatsapp-publico.js';

describe('extrairNumeroWaMe', () => {
  it('extrai número de link wa.me com DDI', () => {
    const html = '<a href="https://wa.me/5527999998888">Fale conosco</a>';
    expect(extrairNumeroWaMe(html)).toBe('+5527999998888');
  });

  it('extrai de api.whatsapp.com/send?phone=', () => {
    const html = '<a href="https://api.whatsapp.com/send?phone=5527999998888">WhatsApp</a>';
    expect(extrairNumeroWaMe(html)).toBe('+5527999998888');
  });

  it('retorna null quando a página não tem link de WhatsApp', () => {
    expect(extrairNumeroWaMe('<html><body>site sem contato</body></html>')).toBeNull();
  });
});
