BEGIN;

ALTER TABLE "TemporaryRoom" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false;

UPDATE "TemporaryRoom" SET "isLocked" = true WHERE visibility = 'PRIVATE';

COMMIT;
