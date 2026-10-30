import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../src/lib/prisma.js";
import { requireAuthenticated } from "../src/serverless/auth.js";
import {
  bodyRecord,
  type ApiRequest,
  type ApiResponse,
  HttpError,
  requiredId,
  requiredString,
  requireMethod,
  withErrorHandling,
} from "../src/serverless/handler.js";

const documentoValido = /^(?:\d{8}|\d{11})$/;

async function clientesHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
  requireMethod(req, ["GET", "POST", "PUT", "DELETE"]);
  requireAuthenticated(req);

  if (req.method === "GET") {
    res.status(200).json(await prisma.cliente.findMany({ orderBy: { createdAt: "asc" } }));
    return;
  }

  if (req.method === "POST") {
    const body = bodyRecord(req);
    const documento = requiredString(body, "documento");
    if (!documentoValido.test(documento)) {
      throw new HttpError(400, "El documento debe ser un DNI de 8 dígitos o un RUC de 11 dígitos.");
    }
    const created = await prisma.cliente.create({ data: {
      nombre: requiredString(body, "nombre"),
      empresa: requiredString(body, "empresa"),
      documento,
      telefono: requiredString(body, "telefono"),
    } });
    res.status(201).json(created);
    return;
  }

  const id = requiredId(req);
  if (req.method === "DELETE") {
    await prisma.cliente.delete({ where: { id } });
    res.status(204).end();
    return;
  }

  const body = bodyRecord(req);
  const updates: { nombre?: string; empresa?: string; documento?: string; telefono?: string } = {};
  for (const field of ["nombre", "empresa", "documento", "telefono"] as const) {
    if (body[field] !== undefined) {
      const value = requiredString(body, field);
      if (field === "documento" && !documentoValido.test(value)) {
        throw new HttpError(400, "El documento debe ser un DNI de 8 dígitos o un RUC de 11 dígitos.");
      }
      updates[field] = value;
    }
  }
  if (Object.keys(updates).length === 0) throw new HttpError(400, "Incluye al menos un campo para actualizar.");
  const updated = await prisma.cliente.update({ where: { id }, data: updates });
  res.status(200).json(updated);
}

export const handleClientes = withErrorHandling(clientesHandler);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleClientes(req, res);
}
