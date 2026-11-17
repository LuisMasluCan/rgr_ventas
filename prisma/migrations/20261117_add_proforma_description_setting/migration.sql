CREATE TABLE "configuracion" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("clave")
);

INSERT INTO "configuracion" ("clave", "valor")
SELECT 'descripcion_proforma', "descripcion"
FROM "cotizaciones"
WHERE "descripcion" IS NOT NULL
ORDER BY "fecha_cotizacion" DESC
LIMIT 1
ON CONFLICT ("clave") DO NOTHING;
