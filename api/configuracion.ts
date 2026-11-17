import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DEFAULT_QUOTATION_DESCRIPTION } from "../src/types.js";
import { prisma } from "../src/lib/prisma.js";
import { requireAuthenticated } from "../src/serverless/auth.js";
import {
  bodyRecord,
  type ApiRequest,
  type ApiResponse,
  HttpError,
  requireMethod,
  withErrorHandling,
} from "../src/serverless/handler.js";

const quotationDescriptionKey = "descripcion_proforma";

async function configuracionHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
  requireMethod(req, ["GET", "PUT"]);
  requireAuthenticated(req);

  if (req.method === "GET") {
    const setting = await prisma.configuracion.findUnique({
      where: { clave: quotationDescriptionKey },
    });
    res.status(200).json({ quotationDescription: setting?.valor ?? DEFAULT_QUOTATION_DESCRIPTION });
    return;
  }

  const body = bodyRecord(req);
  const value = body.quotationDescription;
  if (typeof value !== "string" || value.length > 1500) {
    throw new HttpError(400, 'El campo "quotationDescription" debe ser texto de hasta 1500 caracteres.');
  }

  const setting = await prisma.configuracion.upsert({
    where: { clave: quotationDescriptionKey },
    update: { valor: value },
    create: { clave: quotationDescriptionKey, valor: value },
  });
  res.status(200).json({ quotationDescription: setting.valor });
}

export const handleConfiguracion = withErrorHandling(configuracionHandler);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleConfiguracion(req, res);
}
