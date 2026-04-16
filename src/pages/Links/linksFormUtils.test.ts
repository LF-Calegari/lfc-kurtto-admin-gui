import { LinkApiError } from '../../services/linkService';

import {
  buildCreatePayload,
  INITIAL_FORM,
  isValidHttpUrl,
  linkMatchesSearch,
  LOCAL_VALIDATION_MESSAGE,
  toUiError,
  validateForm,
} from './linksFormUtils';

import type { LinkItem } from '../../types/link';

const baseLink: LinkItem = {
  id: '1',
  originalUrl: 'https://example.com/path',
  shortCode: 'abc12',
  shortUrl: 'https://k.tt/abc12',
  clicks: 0,
  isActive: true,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  expiresAt: null,
  deletedAt: null,
};

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

  describe('linkMatchesSearch', () => {
    it('com query vazia retorna true', () => {
      expect(linkMatchesSearch(baseLink, '')).toBe(true);
      expect(linkMatchesSearch(baseLink, '   ')).toBe(true);
    });

    it('filtra por código, URL original ou curta (case insensitive)', () => {
      expect(linkMatchesSearch(baseLink, 'abc12')).toBe(true);
      expect(linkMatchesSearch(baseLink, 'EXAMPLE')).toBe(true);
      expect(linkMatchesSearch(baseLink, 'k.tt')).toBe(true);
    });

    it('retorna false quando não há match', () => {
      expect(linkMatchesSearch(baseLink, 'zzz')).toBe(false);
    });
  });
});
