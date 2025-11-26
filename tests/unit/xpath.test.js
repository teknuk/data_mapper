import { describe, it, expect } from 'vitest';
import { generateXPath } from '../../src/utils/xpath.js';

describe('generateXPath', () => {
  it('returns ID-based XPath when element has id', () => {
    const el = { id: 'test-id' };
    const xp = generateXPath(el);
    expect(xp).toBe('//*[@id="test-id"]');
  });
});
