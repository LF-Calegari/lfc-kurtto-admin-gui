import { LinkApiError } from '../../services/linkService';

import type { CreateLinkPayload } from '../../types/link';

export interface LinkFormState {
  originalUrl: string;
}

export interface LinkValidationErrors {
  originalUrl?: string;
}

export const INITIAL_FORM: LinkFormState = { originalUrl: '' };

export const LOCAL_VALIDATION_MESSAGE = 'Revise os campos obrigatórios antes de continuar.';

export function isValidHttpUrl(value: string): boolean {
  try {
    const normalized = new URL(value.trim());
    return normalized.protocol === 'http:' || normalized.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateForm(form: LinkFormState): LinkValidationErrors {
  const errors: LinkValidationErrors = {};
  const urlValue = form.originalUrl.trim();

  if (!urlValue) {
    errors.originalUrl = LOCAL_VALIDATION_MESSAGE;
  } else if (!isValidHttpUrl(urlValue)) {
    errors.originalUrl = 'Informe uma URL válida.';
  } else if (urlValue.length > 2048) {
    errors.originalUrl = LOCAL_VALIDATION_MESSAGE;
  }

  return errors;
}

export function buildCreatePayload(form: LinkFormState): CreateLinkPayload {
  return {
    originalUrl: form.originalUrl.trim(),
  };
}

export function toUiError(error: unknown): string {
  if (error instanceof LinkApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocorreu um erro inesperado. Tente novamente em instantes.';
}

