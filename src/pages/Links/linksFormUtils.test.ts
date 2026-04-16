import { LinkApiError } from '../../services/linkService';

import {
  buildCreatePayload,
  INITIAL_FORM,
  isValidHttpUrl,
  LOCAL_VALIDATION_MESSAGE,
  toUiError,
  validateForm,
} from './linksFormUtils';

describe('linksFormUtils', () => {
  describe('isValidHttpUrl', () => {
    it('aceita http e https', () => {
      expect(isValidHttpUrl('https://a.com')).toBe(true);
      expect(isValidHttpUrl('  http://b.com/x  ')).toBe(true);
    });

    it('rejeita outros protocolos', () => {
      expect(isValidHttpUrl('ftp://files.test/x')).toBe(false);
      expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
    });

    it('rejeita string inválida', () => {
      expect(isValidHttpUrl('não-é-url')).toBe(false);
    });
  });

  describe('validateForm', () => {
    it('exige URL', () => {
      expect(validateForm({ ...INITIAL_FORM, originalUrl: '   ' }).originalUrl).toBe(LOCAL_VALIDATION_MESSAGE);
    });

    it('valida protocolo', () => {
      expect(validateForm({ originalUrl: 'ftp://x.com' }).originalUrl).toBe('Informe uma URL válida.');
    });

    it('rejeita URL acima de 2048 caracteres', () => {
      const long = `https://example.com/${'x'.repeat(2030)}`;
      expect(long.length).toBeGreaterThan(2048);
      expect(validateForm({ originalUrl: long }).originalUrl).toBe(LOCAL_VALIDATION_MESSAGE);
    });

    it('retorna vazio quando válido', () => {
      expect(validateForm({ originalUrl: 'https://ok.com' })).toEqual({});
    });
  });

  describe('buildCreatePayload', () => {
    it('envia apenas originalUrl trimado', () => {
      expect(buildCreatePayload({ originalUrl: '  https://z.com  ' })).toEqual({
        originalUrl: 'https://z.com',
      });
    });
  });

  describe('toUiError', () => {
    it('usa mensagem de LinkApiError', () => {
      expect(toUiError(new LinkApiError('msg', 400))).toBe('msg');
    });

    it('usa mensagem de Error genérico', () => {
      expect(toUiError(new Error('e'))).toBe('e');
    });

    it('usa fallback para valor desconhecido', () => {
      expect(toUiError(123)).toBe('Ocorreu um erro inesperado. Tente novamente em instantes.');
    });
  });

});
