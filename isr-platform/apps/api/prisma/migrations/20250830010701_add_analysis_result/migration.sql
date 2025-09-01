-- CreateTable
CREATE TABLE "AnalysisResult" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "persistenceScore" DOUBLE PRECISION NOT NULL,
    "analysisTimestamp" TIMESTAMP(3) NOT NULL,
    "locationCount" INTEGER NOT NULL,
    "timeWindowHours" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalysisResult_deviceId_idx" ON "AnalysisResult"("deviceId");

-- CreateIndex
CREATE INDEX "AnalysisResult_persistenceScore_idx" ON "AnalysisResult"("persistenceScore");

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
