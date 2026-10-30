import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../src/lib/prisma.js";
import {
  type ApiRequest,
  type ApiResponse,
  requireMethod,
  withErrorHandling,
} from "../src/serverless/handler.js";

async function healthHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
  requireMethod(req, ["GET"]);
  await prisma.$queryRaw`SELECT 1`;
  res.status(200).json({ ok: true, database: "connected" });
}

export const handleHealth = withErrorHandling(healthHandler);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleHealth(req, res);
}
