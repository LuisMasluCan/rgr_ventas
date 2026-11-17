ALTER TABLE "maquinarias"
ADD COLUMN "descripcion_proforma" TEXT;

UPDATE "maquinarias" AS machine
SET "descripcion_proforma" = COALESCE(
    (
        SELECT quotation."descripcion"
        FROM "cotizaciones" AS quotation
        WHERE quotation."maquinaria_id" = machine."id"
          AND quotation."descripcion" IS NOT NULL
        ORDER BY quotation."fecha_cotizacion" DESC
        LIMIT 1
    ),
    (
        SELECT setting."valor"
        FROM "configuracion" AS setting
        WHERE setting."clave" = 'descripcion_proforma'
    )
);
