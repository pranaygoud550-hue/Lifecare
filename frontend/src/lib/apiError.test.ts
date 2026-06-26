import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from './apiError';

describe('getApiErrorMessage', () => {
  it('redacts Mongo document dumps from API errors', () => {
    const err = {
      data: {
        message:
          'Plan executor error password: "$2a$10$abc" ObjectId(\'abc\') ambulanceDetails: { location: { coordinates: [] } }',
      },
    };
    expect(getApiErrorMessage(err, 'Demo sign-in failed')).toBe('Demo sign-in failed');
  });

  it('keeps short safe messages', () => {
    const err = { data: { message: 'Invalid demo account' } };
    expect(getApiErrorMessage(err, 'Fallback')).toBe('Invalid demo account');
  });
});
