-- Remove unique constraint on templateId and platformId to allow multiple items from same template on same platform
DROP INDEX IF EXISTS "public"."ItemListing_templateId_platformId_key";

