CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $function$
  SELECT public.unaccent('unaccent'::regdictionary, $1);
$function$;--> statement-breakpoint
CREATE INDEX "game_slug_search_trgm_idx" ON "game" USING gin ((public.immutable_unaccent(lower("slug"))) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "game_name_search_trgm_idx" ON "game" USING gin ((public.immutable_unaccent(lower("name"))) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "game_aliases_search_trgm_idx" ON "game" USING gin ((public.immutable_unaccent(lower(coalesce("aliases"::text, '')))) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "profile_username_search_trgm_idx" ON "profile" USING gin ((public.immutable_unaccent(lower("username"))) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "profile_display_name_search_trgm_idx" ON "profile" USING gin ((public.immutable_unaccent(lower(coalesce("display_name", '')))) gin_trgm_ops);