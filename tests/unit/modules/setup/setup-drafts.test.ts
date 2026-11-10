import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ReadySetupDraft,
  SetupCreationResult,
  SetupDraft,
  SetupDraftContext,
} from '../../../../src/modules/setup/setup-creation.types.js';
import {
  SetupDraftError,
  SetupDraftStore,
} from '../../../../src/modules/setup/setup-drafts.js';
import type { VoiceCreatorConfiguration } from '../../../../src/modules/setup/setup.repository.js';

const context: SetupDraftContext = {
  guildDiscordId: '12345678901234567',
  administratorDiscordId: '22345678901234567',
  messageDiscordId: '32345678901234567',
};
const categoryDiscordId = '42345678901234567';
const values = { name: '  Create your room  ', defaultUserLimit: 4 };
const configuration: VoiceCreatorConfiguration = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  guildDiscordId: context.guildDiscordId,
  creatorChannelDiscordId: '52345678901234567',
  categoryDiscordId,
  defaultUserLimit: 4,
  roomCommandsEnabled: true,
  deletedAt: null,
  createdAt: new Date('2026-11-10T10:00:00.000Z'),
  updatedAt: new Date('2026-11-10T10:00:00.000Z'),
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('SetupDraftStore', () => {
  let store: SetupDraftStore;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    store = new SetupDraftStore();
  });

  afterEach(async () => {
    await store.dispose();
    vi.useRealTimers();
  });

  function ready(): ReadySetupDraft {
    const draft = store.begin(context);
    const selected = store.selectCategory(draft, context, categoryDiscordId);
    return store.review(selected, context, values);
  }

  it('starts isolated editing drafts with opaque UUIDs and a fixed ten-minute TTL', () => {
    const first = store.begin(context);
    const second = store.begin(context);
    expect(first).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/), revision: 0,
      context, expiresAt: 601000, status: 'editing', input: {},
    });
    expect(second.id).not.toBe(first.id);
    expect(store.get(first, context)).toEqual(first);
  });

  it('supports deterministic IDs and clock without refreshing expiry on edits', async () => {
    await store.dispose();
    let now = 20;
    store = new SetupDraftStore({ now: () => now, createId: () => 'opaque-test-id' });
    const first = store.begin(context);
    now = 21;
    const selected = store.selectCategory(first, context, categoryDiscordId);
    expect(selected).toMatchObject({ id: 'opaque-test-id', expiresAt: 600020 });
    now = 600020;
    expect(() => store.get(selected, context)).toThrow(SetupDraftError);
  });

  it('increments revisions for category, review and back, invalidating every old reference', () => {
    const initial = store.begin(context);
    const selected = store.selectCategory(initial, context, categoryDiscordId);
    expect(selected).toMatchObject({ revision: 1, status: 'editing', input: { categoryDiscordId } });
    expect(() => store.get(initial, context)).toThrow(SetupDraftError);
    const reviewed = store.review(selected, context, values);
    expect(reviewed).toMatchObject({
      revision: 2, status: 'review',
      input: { categoryDiscordId, name: 'Create your room', defaultUserLimit: 4 },
    });
    expect(() => store.get(selected, context)).toThrow(SetupDraftError);
    const editing = store.back(reviewed, context);
    expect(editing).toMatchObject({ revision: 3, status: 'editing', input: reviewed.input });
    expect(() => store.get(reviewed, context)).toThrow(SetupDraftError);
    const changed = store.selectCategory(editing, context, '62345678901234567');
    expect(changed).toMatchObject({ revision: 4, input: { categoryDiscordId: '62345678901234567' } });
    expect(() => store.get(editing, context)).toThrow(SetupDraftError);
  });

  it.each(['guildDiscordId', 'administratorDiscordId', 'messageDiscordId'] as const)(
    'rejects a different %s in every operation without changing state', async (field) => {
      const draft = ready();
      const wrongContext = { ...context, [field]: '72345678901234567' };
      let executions = 0;
      const action = async (): Promise<SetupCreationResult> => { executions++; return { status: 'failed' }; };
      expect(() => store.get(draft, wrongContext)).toThrow(SetupDraftError);
      expect(() => store.selectCategory(draft, wrongContext, categoryDiscordId)).toThrow(SetupDraftError);
      expect(() => store.review(draft, wrongContext, values)).toThrow(SetupDraftError);
      expect(() => store.back(draft, wrongContext)).toThrow(SetupDraftError);
      expect(() => store.cancel(draft, wrongContext)).toThrow(SetupDraftError);
      await expect(store.confirm(draft, wrongContext, action)).rejects.toBeInstanceOf(SetupDraftError);
      expect(executions).toBe(0);
      expect(store.get(draft, context)).toEqual(draft);
    },
  );

  it('rejects stale revisions and unknown IDs in every operation', async () => {
    const draft = ready();
    let executions = 0;
    for (const ref of [{ id: draft.id, revision: 0 }, { id: 'missing', revision: draft.revision }]) {
      expect(() => store.get(ref, context)).toThrow(SetupDraftError);
      expect(() => store.selectCategory(ref, context, categoryDiscordId)).toThrow(SetupDraftError);
      expect(() => store.review(ref, context, values)).toThrow(SetupDraftError);
      expect(() => store.back(ref, context)).toThrow(SetupDraftError);
      expect(() => store.cancel(ref, context)).toThrow(SetupDraftError);
      await expect(store.confirm(ref, context, async () => { executions++; return { status: 'failed' }; }))
        .rejects.toBeInstanceOf(SetupDraftError);
    }
    expect(executions).toBe(0);
    expect(store.get(draft, context)).toEqual(draft);
  });

  it.each(['guildDiscordId', 'administratorDiscordId', 'messageDiscordId'] as const)(
    'rejects malformed %s when beginning a draft', (field) => {
      expect(() => store.begin({ ...context, [field]: '' })).toThrow(SetupDraftError);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('rejects invalid category IDs without consuming the revision', () => {
    const draft = store.begin(context);
    expect(() => store.selectCategory(draft, context, 'bad-id')).toThrow(SetupDraftError);
    expect(store.get(draft, context)).toEqual(draft);
  });

  it.each([
    { name: '', defaultUserLimit: 0 },
    { name: '   ', defaultUserLimit: 0 },
    { name: 'x'.repeat(101), defaultUserLimit: 0 },
    { name: 'Entry', defaultUserLimit: -1 },
    { name: 'Entry', defaultUserLimit: 100 },
    { name: 'Entry', defaultUserLimit: 1.5 },
    { name: 'Entry', defaultUserLimit: NaN },
  ])('rejects invalid review input %j without consuming the revision', (input) => {
    const initial = store.begin(context);
    const selected = store.selectCategory(initial, context, categoryDiscordId);
    expect(() => store.review(selected, context, input)).toThrow(SetupDraftError);
    expect(store.get(selected, context)).toEqual(selected);
  });

  it.each([0, 1, 99])('accepts the complete review with limit %s', (defaultUserLimit) => {
    const initial = store.begin(context);
    const selected = store.selectCategory(initial, context, categoryDiscordId);
    expect(store.review(selected, context, { name: 'x'.repeat(100), defaultUserLimit }).input)
      .toEqual({ categoryDiscordId, name: 'x'.repeat(100), defaultUserLimit });
  });

  it('rejects review without a category and confirm before review even with complete input', async () => {
    const initial = store.begin(context);
    let executions = 0;
    const action = async (): Promise<SetupCreationResult> => { executions++; return { status: 'failed' }; };
    expect(() => store.review(initial, context, values)).toThrow(SetupDraftError);
    await expect(store.confirm(initial, context, action)).rejects.toBeInstanceOf(SetupDraftError);
    const selected = store.selectCategory(initial, context, categoryDiscordId);
    await expect(store.confirm(selected, context, action)).rejects.toBeInstanceOf(SetupDraftError);
    const reviewed = store.review(selected, context, values);
    const editing = store.back(reviewed, context);
    await expect(store.confirm(editing, context, action)).rejects.toBeInstanceOf(SetupDraftError);
    expect(executions).toBe(0);
  });

  it('rejects back while editing and requires back before changing a reviewed draft', () => {
    const initial = store.begin(context);
    expect(() => store.back(initial, context)).toThrow(SetupDraftError);
    const draft = ready();
    expect(() => store.selectCategory(draft, context, categoryDiscordId)).toThrow(SetupDraftError);
    expect(() => store.review(draft, context, values)).toThrow(SetupDraftError);
    expect(store.get(draft, context)).toEqual(draft);
  });

  it.each(['editing', 'review'] as const)('cancels %s drafts using memory only', async (status) => {
    const draft = status === 'review' ? ready() : store.begin(context);
    store.cancel(draft, context);
    expect(vi.getTimerCount()).toBe(0);
    expect(() => store.get(draft, context)).toThrow(SetupDraftError);
    let executions = 0;
    await expect(store.confirm(draft, context, async () => { executions++; return { status: 'failed' }; }))
      .rejects.toBeInstanceOf(SetupDraftError);
    expect(executions).toBe(0);
  });

  it('expires idle drafts at exactly 600000ms and discards their timers', async () => {
    const draft = ready();
    await vi.advanceTimersByTimeAsync(599999);
    expect(store.get(draft, context).status).toBe('review');
    await vi.advanceTimersByTimeAsync(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(() => store.get(draft, context)).toThrow(SetupDraftError);
    let executions = 0;
    await expect(store.confirm(draft, context, async () => { executions++; return { status: 'failed' }; }))
      .rejects.toBeInstanceOf(SetupDraftError);
    expect(executions).toBe(0);
  });

  it('latches concurrent confirms synchronously and replays the terminal result without executing again', async () => {
    const draft = ready();
    const work = deferred<SetupCreationResult>();
    let executions = 0;
    const action = async (): Promise<SetupCreationResult> => { executions++; return work.promise; };
    const first = store.confirm(draft, context, action);
    const second = store.confirm(draft, context, action);
    expect(store.get(draft, context).status).toBe('creating');
    await Promise.resolve();
    expect(executions).toBe(1);
    work.resolve({ status: 'failed' });
    expect(await Promise.all([first, second])).toEqual([{ status: 'failed' }, { status: 'failed' }]);
    expect(store.get(draft, context)).toMatchObject({ status: 'failed', result: { status: 'failed' } });
    expect(await store.confirm(draft, context, action)).toEqual({ status: 'failed' });
    expect(executions).toBe(1);
  });

  it('rejects every edit and cancellation while creating', async () => {
    const draft = ready();
    const work = deferred<SetupCreationResult>();
    const pending = store.confirm(draft, context, () => work.promise);
    expect(() => store.selectCategory(draft, context, categoryDiscordId)).toThrow(SetupDraftError);
    expect(() => store.review(draft, context, values)).toThrow(SetupDraftError);
    expect(() => store.back(draft, context)).toThrow(SetupDraftError);
    expect(() => store.cancel(draft, context)).toThrow(SetupDraftError);
    work.resolve({ status: 'failed' });
    await pending;
  });

  it.each<SetupCreationResult>([
    { status: 'created', configuration },
    { status: 'failed' },
    { status: 'partial', channelDiscordId: '52345678901234567' },
    { status: 'uncertain' },
  ])('makes $status terminal with no retry or further edits', async (result) => {
    const draft = ready();
    let executions = 0;
    const action = async () => { executions++; return result; };
    expect(await store.confirm(draft, context, action)).toEqual(result);
    expect(await store.confirm(draft, context, action)).toEqual(result);
    expect(executions).toBe(1);
    expect(store.get(draft, context)).toMatchObject({ status: result.status, result });
    expect(() => store.selectCategory(draft, context, categoryDiscordId)).toThrow(SetupDraftError);
    expect(() => store.review(draft, context, values)).toThrow(SetupDraftError);
    expect(() => store.back(draft, context)).toThrow(SetupDraftError);
    expect(() => store.cancel(draft, context)).toThrow(SetupDraftError);
  });

  it.each(['synchronous', 'asynchronous'] as const)('turns %s action exceptions into private, terminal uncertain results', async (kind) => {
    const draft = ready();
    const secret = new Error('private upstream details');
    let executions = 0;
    const action = (): Promise<SetupCreationResult> => {
      executions++;
      if (kind === 'synchronous') throw secret;
      return Promise.reject(secret);
    };
    expect(await store.confirm(draft, context, action)).toEqual({ status: 'uncertain' });
    expect(await store.confirm(draft, context, action)).toEqual({ status: 'uncertain' });
    expect(executions).toBe(1);
    expect(store.get(draft, context).result).toEqual({ status: 'uncertain' });
  });

  it('keeps in-flight work drainable across TTL expiry without resurrecting it on completion', async () => {
    const draft = ready();
    const work = deferred<SetupCreationResult>();
    let executions = 0;
    const pending = store.confirm(draft, context, async () => { executions++; return work.promise; });
    await vi.advanceTimersByTimeAsync(600000);
    expect(() => store.get(draft, context)).toThrow(SetupDraftError);
    await expect(store.confirm(draft, context, async () => { executions++; return { status: 'failed' }; }))
      .rejects.toBeInstanceOf(SetupDraftError);
    let disposed = false;
    const disposing = store.dispose().then(() => { disposed = true; });
    await Promise.resolve();
    expect(disposed).toBe(false);
    work.resolve({ status: 'partial', channelDiscordId: '52345678901234567' });
    expect(await pending).toEqual({ status: 'partial', channelDiscordId: '52345678901234567' });
    await disposing;
    expect(disposed).toBe(true);
    expect(executions).toBe(1);
    expect(() => store.get(draft, context)).toThrow(SetupDraftError);
  });

  it('cannot resurrect an expired draft when work finishes before disposal', async () => {
    const draft = ready();
    const work = deferred<SetupCreationResult>();
    const pending = store.confirm(draft, context, () => work.promise);
    await vi.advanceTimersByTimeAsync(600000);
    work.resolve({ status: 'failed' });
    expect(await pending).toEqual({ status: 'failed' });
    expect(() => store.get(draft, context)).toThrow(SetupDraftError);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases terminal drafts at TTL rather than retaining their settled operations', async () => {
    await store.dispose();
    store = new SetupDraftStore({ createId: () => 'reused-test-id' });
    const draft = ready();
    expect(() => store.begin(context)).toThrow(SetupDraftError);
    await store.confirm(draft, context, async () => ({ status: 'failed' }));
    await vi.advanceTimersByTimeAsync(600000);
    expect(() => store.get(draft, context)).toThrow(SetupDraftError);
    expect(store.begin(context)).toMatchObject({ id: 'reused-test-id', status: 'editing' });
  });

  it('disposes idle state immediately, closes every method, and awaits all in-flight work', async () => {
    const idle = store.begin(context);
    const first = ready();
    const second = ready();
    const firstWork = deferred<SetupCreationResult>();
    const secondWork = deferred<SetupCreationResult>();
    const firstPending = store.confirm(first, context, () => firstWork.promise);
    const secondPending = store.confirm(second, context, () => secondWork.promise);
    let disposed = false;
    const disposing = store.dispose().then(() => { disposed = true; });
    const disposingAgain = store.dispose();
    expect(vi.getTimerCount()).toBe(0);
    expect(() => store.begin(context)).toThrow(SetupDraftError);
    expect(() => store.get(idle, context)).toThrow(SetupDraftError);
    expect(() => store.selectCategory(first, context, categoryDiscordId)).toThrow(SetupDraftError);
    expect(() => store.review(first, context, values)).toThrow(SetupDraftError);
    expect(() => store.back(first, context)).toThrow(SetupDraftError);
    expect(() => store.cancel(first, context)).toThrow(SetupDraftError);
    await expect(store.confirm(first, context, async () => ({ status: 'failed' })))
      .rejects.toBeInstanceOf(SetupDraftError);
    firstWork.resolve({ status: 'failed' });
    await firstPending;
    expect(disposed).toBe(false);
    secondWork.resolve({ status: 'uncertain' });
    await Promise.all([secondPending, disposing, disposingAgain]);
    expect(disposed).toBe(true);
    expect(() => store.begin(context)).toThrow(SetupDraftError);
  });

  it('copies caller context, review values and every draft returned by the store', () => {
    const mutableContext = { ...context };
    const draft = store.begin(mutableContext);
    const ref = { id: draft.id, revision: draft.revision };
    mutableContext.administratorDiscordId = '72345678901234567';
    draft.context.guildDiscordId = '72345678901234567';
    draft.input.categoryDiscordId = categoryDiscordId;
    draft.status = 'review';
    expect(store.get(ref, context)).toMatchObject({ status: 'editing', context, input: {} });
    const selected = store.selectCategory(ref, context, categoryDiscordId);
    const reviewValues = { ...values };
    const reviewed = store.review(selected, context, reviewValues);
    const reviewRef = { id: reviewed.id, revision: reviewed.revision };
    reviewValues.name = 'Altered';
    reviewed.input.name = 'Altered';
    const fetched = store.get(reviewRef, context);
    fetched.input.defaultUserLimit = 99;
    expect(store.get(reviewRef, context).input).toEqual({
      categoryDiscordId, name: 'Create your room', defaultUserLimit: 4,
    });
    const editing = store.back(reviewRef, context);
    editing.input.name = 'Altered';
    expect(store.get(editing, context).input.name).toBe('Create your room');
  });

  it('isolates callback snapshots and prevents reentrant callbacks from bypassing creating state', async () => {
    const draft = ready();
    let nested: Promise<SetupCreationResult> | undefined;
    let executions = 0;
    const result = await store.confirm(draft, context, async (snapshot) => {
      executions++;
      snapshot.status = 'editing';
      snapshot.input.name = 'Altered';
      snapshot.context.administratorDiscordId = '72345678901234567';
      expect(() => store.review(draft, context, values)).toThrow(SetupDraftError);
      expect(store.get(draft, context)).toMatchObject({
        status: 'creating', context, input: { name: 'Create your room' },
      });
      nested = store.confirm(draft, context, async () => { executions++; return { status: 'failed' }; });
      return { status: 'uncertain' };
    });
    expect(result).toEqual({ status: 'uncertain' });
    expect(await nested).toEqual({ status: 'uncertain' });
    expect(executions).toBe(1);
  });

  it('deep-copies action results and concurrent/replayed/get results, including configuration dates', async () => {
    const draft = ready();
    const original: SetupCreationResult = { status: 'created', configuration: structuredClone(configuration) };
    const firstPending = store.confirm(draft, context, async () => original);
    const secondPending = store.confirm(draft, context, async () => ({ status: 'failed' }));
    const [first, second] = await Promise.all([firstPending, secondPending]);
    if (first.status !== 'created' || second.status !== 'created') throw new Error('Expected created');
    original.configuration.defaultUserLimit = 99;
    original.configuration.createdAt.setTime(0);
    first.configuration.categoryDiscordId = '72345678901234567';
    first.configuration.updatedAt.setTime(0);
    expect(second.configuration).toEqual(configuration);
    const fetched: SetupDraft = store.get(draft, context);
    if (fetched.result?.status !== 'created') throw new Error('Expected created');
    fetched.result.configuration.defaultUserLimit = 99;
    const replay = await store.confirm(draft, context, async () => ({ status: 'failed' }));
    expect(replay).toEqual({ status: 'created', configuration });
  });
});
