-- CreateEnum
CREATE TYPE "RoomVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "TemporaryRoomStatus" AS ENUM ('CREATING', 'ACTIVE', 'CLOSING', 'CLOSED');

-- CreateTable
CREATE TABLE "VoiceCreator" (
    "id" UUID NOT NULL,
    "guildDiscordId" TEXT NOT NULL,
    "creatorChannelDiscordId" TEXT NOT NULL,
    "categoryDiscordId" TEXT NOT NULL,
    "roomCommandsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VoiceCreator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemporaryRoom" (
    "id" UUID NOT NULL,
    "guildDiscordId" TEXT NOT NULL,
    "voiceCreatorId" UUID NOT NULL,
    "channelDiscordId" TEXT NOT NULL,
    "ownerDiscordId" TEXT,
    "controlMessageDiscordId" TEXT,
    "name" TEXT NOT NULL,
    "userLimit" INTEGER NOT NULL DEFAULT 0,
    "visibility" "RoomVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "TemporaryRoomStatus" NOT NULL DEFAULT 'CREATING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "closedAt" TIMESTAMPTZ(3),

    CONSTRAINT "TemporaryRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VoiceCreator_creatorChannelDiscordId_key" ON "VoiceCreator"("creatorChannelDiscordId");

-- CreateIndex
CREATE INDEX "VoiceCreator_guildDiscordId_idx" ON "VoiceCreator"("guildDiscordId");

-- CreateIndex
CREATE INDEX "VoiceCreator_deletedAt_idx" ON "VoiceCreator"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryRoom_channelDiscordId_key" ON "TemporaryRoom"("channelDiscordId");

-- CreateIndex
CREATE INDEX "TemporaryRoom_guildDiscordId_ownerDiscordId_status_idx" ON "TemporaryRoom"("guildDiscordId", "ownerDiscordId", "status");

-- CreateIndex
CREATE INDEX "TemporaryRoom_channelDiscordId_status_idx" ON "TemporaryRoom"("channelDiscordId", "status");

-- AddForeignKey
ALTER TABLE "TemporaryRoom" ADD CONSTRAINT "TemporaryRoom_voiceCreatorId_fkey" FOREIGN KEY ("voiceCreatorId") REFERENCES "VoiceCreator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
