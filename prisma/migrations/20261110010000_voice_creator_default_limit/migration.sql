ALTER TABLE "VoiceCreator"
ADD COLUMN "defaultUserLimit" INTEGER NOT NULL DEFAULT 0,
ADD CONSTRAINT "VoiceCreator_defaultUserLimit_check"
CHECK ("defaultUserLimit" BETWEEN 0 AND 99);
