BEGIN;

ALTER TABLE "TemporaryRoom"
  ADD COLUMN "controlVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "priorityMemberDiscordId" TEXT,
  ADD COLUMN "priorityExpiresAt" TIMESTAMPTZ(3);

CREATE TABLE "RoomPresence" (
  "id" UUID NOT NULL,
  "roomId" UUID NOT NULL,
  "memberDiscordId" TEXT NOT NULL,
  "isBot" BOOLEAN NOT NULL,
  "joinedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "RoomPresence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RoomPresence_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "TemporaryRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RoomAllowedMember" (
  "id" UUID NOT NULL,
  "roomId" UUID NOT NULL,
  "memberDiscordId" TEXT NOT NULL,
  CONSTRAINT "RoomAllowedMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RoomAllowedMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "TemporaryRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PendingOwnershipTransfer" (
  "id" UUID NOT NULL,
  "roomId" UUID NOT NULL,
  "ownerDiscordId" TEXT NOT NULL,
  "targetDiscordId" TEXT NOT NULL,
  "controlVersion" INTEGER NOT NULL,
  "expiresAt" TIMESTAMPTZ(3),
  CONSTRAINT "PendingOwnershipTransfer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PendingOwnershipTransfer_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "TemporaryRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RoomPresence_roomId_memberDiscordId_key" ON "RoomPresence"("roomId", "memberDiscordId");
CREATE UNIQUE INDEX "RoomAllowedMember_roomId_memberDiscordId_key" ON "RoomAllowedMember"("roomId", "memberDiscordId");
CREATE UNIQUE INDEX "PendingOwnershipTransfer_roomId_key" ON "PendingOwnershipTransfer"("roomId");

-- Intentionally fails on existing duplicate owners; never rewrite possession/history.
CREATE UNIQUE INDEX "TemporaryRoom_active_owner_key" ON "TemporaryRoom"("guildDiscordId", "ownerDiscordId")
  WHERE "ownerDiscordId" IS NOT NULL AND "status" IN ('CREATING', 'ACTIVE', 'CLOSING');

ALTER TABLE "RoomPresence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoomAllowedMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PendingOwnershipTransfer" ENABLE ROW LEVEL SECURITY;

COMMIT;
