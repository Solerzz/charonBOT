import { randomUUID } from 'node:crypto';

import type {
  ReadySetupDraft,
  SetupCreationInput,
  SetupCreationResult,
  SetupDraft,
  SetupDraftContext,
  SetupDraftRef,
} from './setup-creation.types.js';
import {
  defaultUserLimitSchema,
  discordIdSchema,
  setupChannelNameSchema,
} from './setup.schemas.js';

const draftTtlMs = 600000;

interface DraftEntry {
  draft: SetupDraft;
  timer: ReturnType<typeof setTimeout>;
  expired: boolean;
  operation?: Promise<SetupCreationResult>;
}

export class SetupDraftError extends Error {
  constructor() {
    super('Setup draft is unavailable or invalid for this action');
    this.name = 'SetupDraftError';
  }
}

export class SetupDraftStore {
  private readonly entries = new Map<string, DraftEntry>();
  private readonly now: () => number;
  private readonly createId: () => string;
  private closed = false;
  private disposal?: Promise<void>;

  constructor(options: { now?: () => number; createId?: () => string } = {}) {
    this.now = options.now ?? Date.now;
    this.createId = options.createId ?? randomUUID;
  }

  begin(context: SetupDraftContext): SetupDraft {
    if (
      this.closed ||
      !discordIdSchema.safeParse(context.guildDiscordId).success ||
      !discordIdSchema.safeParse(context.administratorDiscordId).success ||
      !discordIdSchema.safeParse(context.messageDiscordId).success
    ) {
      throw new SetupDraftError();
    }

    const id = this.createId();
    if (this.entries.has(id)) throw new SetupDraftError();
    const draft: SetupDraft = {
      id,
      revision: 0,
      context: structuredClone(context),
      expiresAt: this.now() + draftTtlMs,
      status: 'editing',
      input: {},
    };
    const timer = setTimeout(() => this.expire(entry), draftTtlMs);
    timer.unref();
    const entry: DraftEntry = { draft, timer, expired: false };
    this.entries.set(id, entry);
    return structuredClone(draft);
  }

  get(ref: SetupDraftRef, context: SetupDraftContext): SetupDraft {
    return structuredClone(this.require(ref, context).draft);
  }

  selectCategory(
    ref: SetupDraftRef,
    context: SetupDraftContext,
    categoryDiscordId: string,
  ): SetupDraft {
    const { draft } = this.require(ref, context);
    if (draft.status !== 'editing' || !discordIdSchema.safeParse(categoryDiscordId).success) {
      throw new SetupDraftError();
    }
    draft.input.categoryDiscordId = categoryDiscordId;
    draft.revision++;
    return structuredClone(draft);
  }

  review(
    ref: SetupDraftRef,
    context: SetupDraftContext,
    values: Pick<SetupCreationInput, 'name' | 'defaultUserLimit'>,
  ): ReadySetupDraft {
    const { draft } = this.require(ref, context);
    const category = discordIdSchema.safeParse(draft.input.categoryDiscordId);
    const name = setupChannelNameSchema.safeParse(values.name);
    const limit = defaultUserLimitSchema.safeParse(values.defaultUserLimit);
    if (draft.status !== 'editing' || !category.success || !name.success || !limit.success) {
      throw new SetupDraftError();
    }
    const input: SetupCreationInput = {
      categoryDiscordId: category.data,
      name: name.data,
      defaultUserLimit: limit.data,
    };
    draft.input = input;
    draft.status = 'review';
    draft.revision++;
    return structuredClone({ ...draft, input });
  }

  back(ref: SetupDraftRef, context: SetupDraftContext): SetupDraft {
    const { draft } = this.require(ref, context);
    if (draft.status !== 'review') throw new SetupDraftError();
    draft.status = 'editing';
    draft.revision++;
    return structuredClone(draft);
  }

  cancel(ref: SetupDraftRef, context: SetupDraftContext): void {
    const entry = this.require(ref, context);
    if (entry.draft.status !== 'editing' && entry.draft.status !== 'review') {
      throw new SetupDraftError();
    }
    this.remove(entry);
  }

  async confirm(
    ref: SetupDraftRef,
    context: SetupDraftContext,
    action: (draft: ReadySetupDraft) => Promise<SetupCreationResult>,
  ): Promise<SetupCreationResult> {
    const entry = this.require(ref, context);
    const { draft } = entry;
    if (!entry.operation) {
      if (draft.status !== 'review') throw new SetupDraftError();
      // Only review can set this status, after validating and copying all input.
      const snapshot = structuredClone({ ...draft, status: 'creating' }) as ReadySetupDraft;
      draft.status = 'creating';
      // Defer the callback so even reentrant confirms observe the same latch.
      entry.operation = Promise.resolve()
        .then(() => action(snapshot))
        .then((result) => structuredClone(result))
        .catch((): SetupCreationResult => ({ status: 'uncertain' }))
        .then((result) => {
          draft.status = result.status;
          draft.result = result;
          if (this.closed || entry.expired || this.now() >= draft.expiresAt) {
            this.remove(entry);
          }
          return result;
        });
    }
    return structuredClone(await entry.operation);
  }

  dispose(): Promise<void> {
    if (!this.disposal) {
      this.closed = true;
      const operations: Promise<SetupCreationResult>[] = [];
      for (const entry of this.entries.values()) {
        clearTimeout(entry.timer);
        if (entry.operation) operations.push(entry.operation);
        else this.remove(entry);
      }
      this.disposal = Promise.all(operations).then(() => { this.entries.clear(); });
    }
    return this.disposal;
  }

  private require(ref: SetupDraftRef, context: SetupDraftContext): DraftEntry {
    const entry = this.entries.get(ref.id);
    if (
      this.closed || !entry || entry.draft.revision !== ref.revision ||
      entry.draft.context.guildDiscordId !== context.guildDiscordId ||
      entry.draft.context.administratorDiscordId !== context.administratorDiscordId ||
      entry.draft.context.messageDiscordId !== context.messageDiscordId
    ) {
      throw new SetupDraftError();
    }
    if (this.now() >= entry.draft.expiresAt) this.expire(entry);
    if (entry.expired) throw new SetupDraftError();
    return entry;
  }

  private expire(entry: DraftEntry): void {
    entry.expired = true;
    clearTimeout(entry.timer);
    // An expired operation still belongs to this store until it has drained.
    if (entry.draft.status !== 'creating') this.remove(entry);
  }

  private remove(entry: DraftEntry): void {
    clearTimeout(entry.timer);
    this.entries.delete(entry.draft.id);
  }
}
