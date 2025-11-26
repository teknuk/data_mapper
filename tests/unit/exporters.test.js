import { describe, it, expect } from 'vitest';
import { buildFilename, toCsvBlob } from '../../src/utils/exporters.js';

describe('exporters', () => {
  it('buildFilename should include template and extension', () => {
    const name = buildFilename('my template', 'json');
    expect(name.endsWith('.json')).toBe(true);
    expect(name).toMatch(/^my_template-\d{8}-\d{6}\.json$/);
  });

  it('toCsvBlob should produce CSV with header and rows', async () => {
    const data = {
      title: ['A', 'B'],
      price: ['10', '20']
    };
    const blob = toCsvBlob(data);
    const text = await blob.text();
    const lines = text.trim().split('\n');
    expect(lines[0]).toBe('title,price');
    expect(lines[1]).toBe('A,10');
    expect(lines[2]).toBe('B,20');
  });
});
