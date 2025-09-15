-- DropForeignKey
ALTER TABLE "public"."Expense" DROP CONSTRAINT "Expense_groupId_fkey";

-- AlterTable
ALTER TABLE "public"."Expense" ALTER COLUMN "groupId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
