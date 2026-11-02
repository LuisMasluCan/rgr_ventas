ALTER TABLE "maquinarias"
ADD COLUMN "especificaciones_adicionales" JSONB NOT NULL DEFAULT '[]'::jsonb;
