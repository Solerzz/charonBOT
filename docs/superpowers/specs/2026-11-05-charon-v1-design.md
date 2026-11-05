# Charon v1 — Design

## Intent

Charon is a modular Discord bot for temporary voice rooms, room ownership,
moderation by vote, and reputation based on users who actually shared a room.
It is delivered incrementally through GitHub Flow, with one deployable release
per stage.

## Architecture

Use a feature-first modular monolith in one Node.js process. Modules own their
interactions, business rules, services, and repositories. PostgreSQL is the
source of truth; Discord is an external adapter.

```text
src/
├── core/
├── modules/
│   ├── setup/
│   ├── calls/
│   ├── ownership/
│   ├── moderation/
│   └── reputation/
├── shared/
└── index.ts
```

## Technology

- Node.js 20+ and TypeScript strict mode
- Discord.js v14
- Prisma ORM with Supabase PostgreSQL
- Zod validation
- Pino structured JSON logging
- Vitest

## Administrative setup

`/setup init` opens a configuration menu. Administrators can create Voice
Creators, change their category/name, enable or disable room commands, and
delete configuration. A Voice Creator is recognized only by its persisted
Discord channel ID. Each creator has independent configuration.

Deleting configuration immediately prevents new rooms but lets active rooms
continue until empty. Creator channels remain ordinary Discord channels.

## Temporary room creation

Entering a configured Voice Creator creates a temporary room in its configured
category, moves the member, persists the room, and posts its control panel in
the voice channel chat. The initial name uses the owner's activity and falls
back to display name, truncated safely to 11 characters.

The owner can choose a name of at most 11 characters, a user limit from 1 to
99 or unlimited (0), and public or private visibility. The owner counts toward
the limit.

Public rooms are visible and joinable by non-blocked users. Private rooms and
their chats are visible only to the owner, current members, and whitelisted
users. There is no external access-request flow.

## Ownership

A user owns at most one active room. When the owner leaves an occupied room,
it becomes ownerless. The longest-present member has exclusive claim priority
for five minutes. If they leave, the next member receives a new five-minute
window. After expiry, any present member may claim it. Empty rooms are closed.

## Removal and blocking

An owner can remove a member directly. This creates a room-specific block that
the current or a future owner may remove. A vote-approved removal creates a
block that cannot be removed until the room ends.

A kick vote lasts two minutes. Bots and the target do not vote. Every other
eligible member present at the start must vote, and at least 51% must approve.
Missing votes expire the vote. Any participant leaving or changing rooms
cancels it immediately. Only one vote may be active per room.

## Reputation

Users may rate only users with whom they shared a managed room continuously
for at least ten minutes. Each evaluator contributes one current +1 or -1 per
target and server. The value may be updated after a 24-hour cooldown; repeated
ratings do not accumulate. Participation history survives room deletion.

## Persistence and recovery

Use UUID internal identifiers and store Discord IDs separately. Active room
state, deadlines, memberships, access, blocks, votes, and ratings are
persisted. Startup recovery reconciles Discord and database state. Operations
must be idempotent and compensate when Discord succeeds but persistence fails,
or vice versa.

## Security

Setup requires Discord server/channel-management permissions. Validate every
interaction server-side with Zod. Never log credentials. Use a pooled database
URL at runtime and a direct URL for migrations.

## Releases

1. `v0.1.0` — infrastructure
2. `v0.2.0` — setup and join-to-create
3. `v0.3.0` — ownership and room controls
4. `v0.4.0` — moderation
5. `v0.5.0` — reputation
6. `v1.0.0` — recovery, resilience, and production readiness

## Non-goals for v1

No web dashboard, Vercel-hosted bot process, Redis, microservices, payments,
clan system, global cross-server reputation, or external request-to-join flow.
