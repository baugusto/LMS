-- AlterTable
ALTER TABLE "LearningPath" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PartnerProfile" ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Topic" ALTER COLUMN "description" DROP NOT NULL;
