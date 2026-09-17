-- CreateTable
CREATE TABLE "VideoViewEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoViewEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VideoViewEvent" ADD CONSTRAINT "VideoViewEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
