-- Remove unique constraint on templateId and platformId
-- This allows multiple items from the same template to be listed on the same platform
DROP INDEX IF EXISTS "public"."ItemListing_templateId_platformId_key";

