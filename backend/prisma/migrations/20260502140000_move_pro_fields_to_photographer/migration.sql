-- Remove professional fields that were incorrectly placed in users
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "experience",
  DROP COLUMN IF EXISTS "deliveryTime",
  DROP COLUMN IF EXISTS "searchPhotos",
  DROP COLUMN IF EXISTS "pricePerHour",
  DROP COLUMN IF EXISTS "additionalPriceInfo";

-- Add professional fields to photographers (correct location)
ALTER TABLE "photographers"
  ADD COLUMN "experienceYears"     INTEGER,
  ADD COLUMN "experienceMonths"    INTEGER,
  ADD COLUMN "deliveryTime"        INTEGER,
  ADD COLUMN "searchPhotos"        TEXT[],
  ADD COLUMN "pricePerHour"        DOUBLE PRECISION,
  ADD COLUMN "additionalPriceInfo" TEXT;
