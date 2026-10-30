import type { VercelRequest, VercelResponse } from "@vercel/node";
import { EstadoMaquinaria } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";
import { requireAuthenticated } from "../src/serverless/auth.js";
import {
  bodyRecord,
  type ApiRequest,
  type ApiResponse,
  enumValue,
  HttpError,
  nullableNumber,
  requiredId,
  requiredNumber,
  requiredString,
  requireMethod,
  withErrorHandling,
} from "../src/serverless/handler.js";

const machineStates = ["Disponible", "En Tránsito", "Vendido"] as const;
const machineStateToPrisma: Record<(typeof machineStates)[number], EstadoMaquinaria> = {
  Disponible: EstadoMaquinaria.Disponible,
  "En Tránsito": EstadoMaquinaria.EnTransito,
  Vendido: EstadoMaquinaria.Vendido,
};
const machineStateFromPrisma: Record<EstadoMaquinaria, (typeof machineStates)[number]> = {
  [EstadoMaquinaria.Disponible]: "Disponible",
  [EstadoMaquinaria.EnTransito]: "En Tránsito",
  [EstadoMaquinaria.Vendido]: "Vendido",
};

function serializeMachine<T extends { estado: EstadoMaquinaria }>(machine: T) {
  return { ...machine, estado: machineStateFromPrisma[machine.estado] };
}

function imageArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 7 || value.some((image) =>
    typeof image !== "string" || !image.trim() || image.length > 400_000
  )) {
    throw new HttpError(400, 'El campo "fotosDetalle" debe contener hasta 7 imágenes válidas.');
  }
  return value;
}

async function maquinariasHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
  requireMethod(req, ["GET", "POST", "PUT", "DELETE"]);
  requireAuthenticated(req);

  if (req.method === "GET") {
    const rows = await prisma.maquinaria.findMany({ orderBy: { createdAt: "asc" } });
    res.status(200).json(rows.map(serializeMachine));
    return;
  }

  if (req.method === "POST") {
    const body = bodyRecord(req);
    const ficha = body.fichaTecnicaUrl;
    if (ficha !== undefined && ficha !== null && typeof ficha !== "string") {
      throw new HttpError(400, 'El campo "fichaTecnicaUrl" debe ser texto o null.');
    }
    const quantity = body.cantidad === undefined ? 1 : requiredNumber(body, "cantidad");
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new HttpError(400, 'El campo "cantidad" debe ser un entero no negativo.');
    }
    const created = await prisma.maquinaria.create({ data: {
      nombre: requiredString(body, "nombre"),
      marca: requiredString(body, "marca"),
      modelo: requiredString(body, "modelo"),
      precio: requiredNumber(body, "precio", true),
      imagenUrl: requiredString(body, "imagenUrl"),
      fichaTecnicaUrl: ficha ?? null,
      fotosDetalle: body.fotosDetalle === undefined ? [] : imageArray(body.fotosDetalle),
      cantidad: quantity,
      motor: requiredString(body, "motor"),
      potencia: requiredNumber(body, "potencia", true),
      peso: nullableNumber(body, "peso"),
      estado: quantity === 0
        ? EstadoMaquinaria.Vendido
        : body.estado === undefined
          ? EstadoMaquinaria.Disponible
        : machineStateToPrisma[enumValue(body.estado, machineStates, "estado")],
    } });
    res.status(201).json(serializeMachine(created));
    return;
  }

  const id = requiredId(req);
  if (req.method === "DELETE") {
    await prisma.maquinaria.delete({ where: { id } });
    res.status(204).end();
    return;
  }

  const body = bodyRecord(req);
  const updates: {
    nombre?: string;
    marca?: string;
    modelo?: string;
    imagenUrl?: string;
    fichaTecnicaUrl?: string | null;
    fotosDetalle?: string[];
    cantidad?: number;
    motor?: string;
    precio?: number;
    potencia?: number;
    peso?: number | null;
    estado?: EstadoMaquinaria;
  } = {};
  for (const field of ["nombre", "marca", "modelo", "imagenUrl", "motor"] as const) {
    if (body[field] !== undefined) updates[field] = requiredString(body, field);
  }
  if (body.fichaTecnicaUrl !== undefined) {
    if (body.fichaTecnicaUrl !== null && typeof body.fichaTecnicaUrl !== "string") {
      throw new HttpError(400, 'El campo "fichaTecnicaUrl" debe ser texto o null.');
    }
    updates.fichaTecnicaUrl = body.fichaTecnicaUrl;
  }
  if (body.fotosDetalle !== undefined) updates.fotosDetalle = imageArray(body.fotosDetalle);
  if (body.cantidad !== undefined) updates.cantidad = requiredNumber(body, "cantidad");
  if (body.precio !== undefined) updates.precio = requiredNumber(body, "precio", true);
  if (body.potencia !== undefined) updates.potencia = requiredNumber(body, "potencia", true);
  if (body.peso !== undefined) updates.peso = nullableNumber(body, "peso");
  if (body.estado !== undefined) {
    updates.estado = machineStateToPrisma[enumValue(body.estado, machineStates, "estado")];
  }
  if (updates.cantidad === 0) updates.estado = EstadoMaquinaria.Vendido;
  if (Object.keys(updates).length === 0) throw new HttpError(400, "Incluye al menos un campo para actualizar.");
  if (updates.cantidad !== undefined && (!Number.isInteger(updates.cantidad) || updates.cantidad < 0)) {
    throw new HttpError(400, 'El campo "cantidad" debe ser un entero no negativo.');
  }
  const updated = await prisma.maquinaria.update({ where: { id }, data: updates });
  res.status(200).json(serializeMachine(updated));
}

export const handleMaquinarias = withErrorHandling(maquinariasHandler);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleMaquinarias(req, res);
}
