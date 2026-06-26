import { describe, expect, it } from '@jest/globals';
import {
  sanitizeErrorMessage,
  shouldExposeErrorInternals,
} from '../../src/utils/sanitizeErrorMessage.js';

describe('sanitizeErrorMessage', () => {
  it('redacts MongoDB document dumps with passwords', () => {
    const raw =
      'Plan executor error :: password: "$2a$10$abc", email: "test@example.com", ObjectId(\'abc\')';
    expect(sanitizeErrorMessage(raw)).toBe('Something went wrong. Please try again.');
  });

  it('maps geo index errors to a short message', () => {
    expect(sanitizeErrorMessage("Can't extract geo keys: { coordinates: [] }")).toBe(
      'Location data is invalid. Please try again.'
    );
  });

  it('passes through short safe messages', () => {
    expect(sanitizeErrorMessage('Invalid demo account')).toBe('Invalid demo account');
  });
});

describe('shouldExposeErrorInternals', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('hides internals on Render', () => {
    process.env.NODE_ENV = 'development';
    process.env.RENDER = 'true';
    expect(shouldExposeErrorInternals()).toBe(false);
  });
});
