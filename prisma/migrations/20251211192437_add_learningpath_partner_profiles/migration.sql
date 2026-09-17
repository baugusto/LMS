-- CreateTable
CREATE TABLE "LearningPathPartnerProfile" (
    "id" TEXT NOT NULL,
    "learningPathId" TEXT NOT NULL,
    "partnerProfileId" TEXT NOT NULL,

    CONSTRAINT "LearningPathPartnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearningPathPartnerProfile_learningPathId_partnerProfileId_key" ON "LearningPathPartnerProfile"("learningPathId", "partnerProfileId");

-- AddForeignKey
ALTER TABLE "LearningPathPartnerProfile" ADD CONSTRAINT "LearningPathPartnerProfile_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPathPartnerProfile" ADD CONSTRAINT "LearningPathPartnerProfile_partnerProfileId_fkey" FOREIGN KEY ("partnerProfileId") REFERENCES "PartnerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
