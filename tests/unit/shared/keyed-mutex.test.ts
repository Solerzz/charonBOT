import { describe, expect, it } from 'vitest';

import { KeyedMutex } from '../../../src/shared/keyed-mutex.js';

describe('KeyedMutex', () => {
  it('runs same-key operations FIFO while other keys proceed independently', async () => {
    const mutex = new KeyedMutex();
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const first = mutex.runExclusive('a', async () => { order.push('first'); await gate; });
    const second = mutex.runExclusive('a', async () => { order.push('second'); });
    const third = mutex.runExclusive('a', async () => { order.push('third'); });
    await mutex.runExclusive('b', async () => { order.push('other'); });
    expect(order).toEqual(['first', 'other']);
    release();
    await Promise.all([first, second, third]);
    expect(order).toEqual(['first', 'other', 'second', 'third']);
    // A subsequent operation must not depend on the settled queue.
    await expect(mutex.runExclusive('a', async () => 42)).resolves.toBe(42);
    expect((mutex as unknown as { tails: Map<string, unknown> }).tails.size).toBe(0);
  });

  it('releases a rejected operation and removes the idle key', async () => {
    const mutex = new KeyedMutex();
    const first = mutex.runExclusive('a', async () => { throw new Error('failure'); });
    const next = mutex.runExclusive('a', async () => 'next');
    await expect(first).rejects.toThrow('failure');
    await expect(next).resolves.toBe('next');
    expect((mutex as unknown as { tails: Map<string, unknown> }).tails.size).toBe(0);
  });
});
