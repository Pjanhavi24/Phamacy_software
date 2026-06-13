-- Add nullable customer_code column
ALTER TABLE "customers" ADD COLUMN "customer_code" TEXT;

-- Backfill existing customers with an incremental code (CUST-00001, CUST-00002, ...)
-- ordered by creation time so the series is stable.
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM "customers"
)
UPDATE "customers" c
SET "customer_code" = 'CUST-' || LPAD(numbered.rn::text, 5, '0')
FROM numbered
WHERE c.id = numbered.id;

-- Enforce uniqueness of the customer code
CREATE UNIQUE INDEX "customers_customer_code_key" ON "customers"("customer_code");
