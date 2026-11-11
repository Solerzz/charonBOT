CREATE TYPE "RoomMemberBlockState" AS ENUM ('BLOCKED', 'UNBLOCK_PENDING');

CREATE TABLE "RoomMemberBlock" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "memberDiscordId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" "RoomMemberBlockState" NOT NULL DEFAULT 'BLOCKED',
    "deniedBefore" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "RoomMemberBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoomMemberBlock_roomId_memberDiscordId_key" ON "RoomMemberBlock"("roomId", "memberDiscordId");

ALTER TABLE "RoomMemberBlock" ADD CONSTRAINT "RoomMemberBlock_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "TemporaryRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoomMemberBlock" ENABLE ROW LEVEL SECURITY;
