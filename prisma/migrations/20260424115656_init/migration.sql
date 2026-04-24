-- CreateTable
CREATE TABLE "Pincode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pincode" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "population" INTEGER NOT NULL,
    "evAdoptionIndex" REAL NOT NULL,
    "peakDemandMW" REAL NOT NULL,
    "availableCapacityMW" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "ChargingStation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pincodeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "chargerTypes" TEXT NOT NULL,
    "portCount" INTEGER NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "dailyUtilization" REAL NOT NULL,
    "dailyEnergyKwh" REAL NOT NULL,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChargingStation_pincodeId_fkey" FOREIGN KEY ("pincodeId") REFERENCES "Pincode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DemandHotspot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "demandScore" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "ChargerProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pincodeId" TEXT NOT NULL,
    "proposedLat" REAL NOT NULL,
    "proposedLng" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "recommendedTypes" TEXT NOT NULL,
    "recommendedPorts" INTEGER NOT NULL,
    "siteScore" REAL NOT NULL,
    "demandScore" REAL NOT NULL,
    "capacityScore" REAL NOT NULL,
    "accessibilityScore" REAL NOT NULL,
    "competitionScore" REAL NOT NULL,
    "feederImpactPct" REAL NOT NULL,
    "feederCode" TEXT,
    "estimatedDailyKwh" REAL NOT NULL,
    "estimatedRevenueInrPerMonth" REAL NOT NULL,
    "paybackMonths" REAL NOT NULL,
    "rationale" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChargerProposal_pincodeId_fkey" FOREIGN KEY ("pincodeId") REFERENCES "Pincode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Pincode_pincode_key" ON "Pincode"("pincode");
