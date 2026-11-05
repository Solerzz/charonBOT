import { describe, expect, it } from 'vitest';

describe('application entrypoint', () => {
  it('loads without starting external services during import', async () => {
    const entrypoint = await import('../../src/index.js');

    expect(entrypoint.start).toBeTypeOf('function');
  });
});
