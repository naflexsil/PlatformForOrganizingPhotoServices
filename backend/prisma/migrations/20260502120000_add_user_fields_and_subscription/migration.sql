-- AlterTable users: add city (personal field for all users)
ALTER TABLE "users" ADD COLUMN "city" TEXT;

-- AlterTable photographers: remove old fields (wrong types / renamed)
ALTER TABLE "photographers"
  DROP COLUMN IF EXISTS "pricePerHour",
  DROP COLUMN IF EXISTS "priceAdditionalInfo",
  DROP COLUMN IF EXISTS "searchPhotos";

-- AlterTable photographers: add professional profile fields
ALTER TABLE "photographers"
  ADD COLUMN "experienceYears"     INTEGER,
  ADD COLUMN "experienceMonths"    INTEGER,
  ADD COLUMN "deliveryTime"        INTEGER,
  ADD COLUMN "searchPhotos"        TEXT[],
  ADD COLUMN "pricePerHour"        DOUBLE PRECISION,
  ADD COLUMN "additionalPriceInfo" TEXT;
