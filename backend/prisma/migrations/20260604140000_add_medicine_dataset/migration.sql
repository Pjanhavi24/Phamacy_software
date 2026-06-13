-- Reference catalog imported from external medicine dataset (for name search/autocomplete)

-- Enable trigram matching for fast fuzzy / substring name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateTable
CREATE TABLE "medicine_dataset" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2),
    "manufacturer" TEXT,
    "type" TEXT,
    "packing" TEXT,
    "generic_name" TEXT,

    CONSTRAINT "medicine_dataset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medicine_dataset_name_idx" ON "medicine_dataset"("name");

-- Trigram index for fast ILIKE '%term%' and prefix suggestions
CREATE INDEX "medicine_dataset_name_trgm_idx" ON "medicine_dataset" USING GIN ("name" gin_trgm_ops);
