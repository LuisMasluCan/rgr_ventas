import type { VercelRequest, VercelResponse } from "@vercel/node";
import { EstadoCotizacion, EstadoMaquinaria } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { requireAuthenticated } from "../src/serverless/auth";
import {
  bodyRecord,
  type ApiRequest,
  type ApiResponse,
  enumValue,
  HttpError,
  requiredId,
  requiredUuid,
  requireMethod,
  withErrorHandling,
} from "../src/serverless/handler";

const quotationStates = ["Cotización", "Asignados", "Contactados", "Cierre"] as const;
const quotationStateToPrisma: Record<(typeof quotationStates)[number], EstadoCotizacion> = {
  "Cotización": EstadoCotizacion.Cotizacion,
  Asignados: EstadoCotizacion.Asignados,
  Contactados: EstadoCotizacion.Contactados,
  Cierre: EstadoCotizacion.Cierre,
};
const quotationStateFromPrisma: Record<EstadoCotizacion, (typeof quotationStates)[number]> = {
  [EstadoCotizacion.Cotizacion]: "Cotización",
  [EstadoCotizacion.Asignados]: "Asignados",
  [EstadoCotizacion.Contactados]: "Contactados",
  [EstadoCotizacion.Cierre]: "Cierre",
};

function serializeQuotation<T extends { estado: EstadoCotizacion }>(quotation: T) {
  return { ...quotation, estado: quotationStateFromPrisma[quotation.estado] };
}

async function cotizacionesHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
  requireMethod(req, ["GET", "POST", "PUT", "DELETE"]);
  requireAuthenticated(req);

  if (req.method === "GET") {
    const rows = await prisma.cotizacion.findMany({
      include: { cliente: true, maquinaria: true },
      orderBy: { fechaCotizacion: "asc" },
    });
    res.status(200).json(rows.map(serializeQuotation));
    return;
  }

  if (req.method === "POST") {
    const body = bodyRecord(req);
    const notas = body.notas;
    if (notas !== undefined && notas !== null && typeof notas !== "string") {
      throw new HttpError(400, 'El campo "notas" debe ser texto o null.');
    }
    const descripcion = quotationDescription(body.descripcion);
    const created = await prisma.cotizacion.create({
      data: {
        clienteId: requiredUuid(body, "clienteId"),
        maquinariaId: requiredUuid(body, "maquinariaId"),
        estado: body.estado === undefined
          ? EstadoCotizacion.Cotizacion
          : quotationStateToPrisma[enumValue(body.estado, quotationStates, "estado")],
        notas: notas ?? null,
        descripcion,
      },
      include: { cliente: true, maquinaria: true },
    });
    res.status(201).json(serializeQuotation(created));
    return;
  }

  const id = requiredId(req);
  if (req.method === "DELETE") {
    await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "cotizaciones" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const current = await transaction.cotizacion.findUnique({
        where: { id },
        select: { estado: true, maquinariaId: true },
      });
      if (!current) throw new HttpError(404, "No se encontró el registro solicitado.");

      if (current.estado === EstadoCotizacion.Cierre) {
        const restoredMachine = await transaction.maquinaria.updateMany({
          where: { id: current.maquinariaId, cantidad: 0, estado: EstadoMaquinaria.Vendido },
          data: { cantidad: { increment: 1 }, estado: EstadoMaquinaria.Disponible },
        });
        if (restoredMachine.count === 0) {
          await transaction.maquinaria.update({
            where: { id: current.maquinariaId },
            data: { cantidad: { increment: 1 } },
          });
        }
      }

      await transaction.cotizacion.delete({ where: { id } });
    });
    res.status(204).end();
    return;
  }

  const body = bodyRecord(req);
  const updates: { estado?: EstadoCotizacion; descripcion?: string; clienteId?: string } = {};
  if (body.estado !== undefined) {
    updates.estado = quotationStateToPrisma[enumValue(body.estado, quotationStates, "estado")];
  }
  if (body.clienteId !== undefined) updates.clienteId = requiredUuid(body, "clienteId");
  if (body.descripcion !== undefined) updates.descripcion = quotationDescription(body.descripcion) ?? "";
  if (Object.keys(updates).length === 0) throw new HttpError(400, "Incluye al menos un campo para actualizar.");

  if (updates.estado === undefined) {
    const updated = await prisma.cotizacion.update({ where: { id }, data: updates });
    res.status(200).json(serializeQuotation(updated));
    return;
  }

  const estado = updates.estado;
  const updated = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT "id" FROM "cotizaciones" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const current = await transaction.cotizacion.findUnique({
      where: { id },
      select: { estado: true, maquinariaId: true },
    });
    if (!current) throw new HttpError(404, "No se encontró el registro solicitado.");
    if (current.estado === estado && updates.descripcion === undefined) {
      return transaction.cotizacion.findUniqueOrThrow({ where: { id } });
    }

    if (estado === EstadoCotizacion.Cierre && current.estado !== EstadoCotizacion.Cierre) {
      const stockChange = await transaction.maquinaria.updateMany({
        where: { id: current.maquinariaId, cantidad: { gt: 0 } },
        data: { cantidad: { decrement: 1 } },
      });
      if (stockChange.count === 0) {
        throw new HttpError(409, "No hay unidades disponibles para cerrar esta venta.");
      }
      const machine = await transaction.maquinaria.findUniqueOrThrow({
        where: { id: current.maquinariaId },
        select: { cantidad: true },
      });
      if (machine.cantidad === 0) {
        await transaction.maquinaria.update({
          where: { id: current.maquinariaId },
          data: { estado: "Vendido" },
        });
      }
    } else if (current.estado === EstadoCotizacion.Cierre && estado !== EstadoCotizacion.Cierre) {
      const machine = await transaction.maquinaria.findUniqueOrThrow({
        where: { id: current.maquinariaId },
        select: { cantidad: true, estado: true },
      });
      await transaction.maquinaria.update({
        where: { id: current.maquinariaId },
        data: {
          cantidad: { increment: 1 },
          ...(machine.cantidad === 0 && machine.estado === "Vendido" ? { estado: "Disponible" } : {}),
        },
      });
    }

    return transaction.cotizacion.update({ where: { id }, data: updates });
  });
  res.status(200).json(serializeQuotation(updated));
}

function quotationDescription(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > 5000) {
    throw new HttpError(400, 'El campo "descripcion" debe ser texto de hasta 5000 caracteres.');
  }
  return value.trim();
}

export const handleCotizaciones = withErrorHandling(cotizacionesHandler);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleCotizaciones(req, res);
}
