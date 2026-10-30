ALTER TABLE "maquinarias"
ADD COLUMN "fotos_detalle" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
