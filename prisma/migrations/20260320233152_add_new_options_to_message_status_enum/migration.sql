/*
  Warnings:

  - The values [PENDING] on the enum `MessageStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MessageStatus_new" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'PARTIALLY_DELIVERED', 'RECEIVED', 'RECEIVING', 'ACCEPTED', 'SCHEDULED', 'FAILED', 'UNDELIVERED', 'CANCELED');
ALTER TABLE "MessageLog" ALTER COLUMN "status" TYPE "MessageStatus_new" USING ("status"::text::"MessageStatus_new");
ALTER TYPE "MessageStatus" RENAME TO "MessageStatus_old";
ALTER TYPE "MessageStatus_new" RENAME TO "MessageStatus";
DROP TYPE "public"."MessageStatus_old";
COMMIT;
