import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  bodyRecord,
  type ApiRequest,
  type ApiResponse,
  HttpError,
  requireMethod,
  withErrorHandling,
} from "../src/serverless/handler.js";
import {
  clearSessionCookie,
  hasValidSession,
  setSessionCookie,
  verifyCredentials,
} from "../src/serverless/auth.js";

async function authHandler(request: ApiRequest, response: ApiResponse): Promise<void> {
  requireMethod(request, ["GET", "POST", "DELETE"]);
  response.setHeader("Cache-Control", "no-store");

  if (request.method === "GET") {
    response.status(200).json({ authenticated: hasValidSession(request) });
    return;
  }

  if (request.method === "DELETE") {
    clearSessionCookie(response);
    response.status(204).end();
    return;
  }

  const body = bodyRecord(request);
  if (!verifyCredentials(body.email, body.password)) {
    throw new HttpError(401, "Correo o contraseña incorrectos.");
  }

  setSessionCookie(response);
  response.status(200).json({ authenticated: true });
}

export const handleAuth = withErrorHandling(authHandler);

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  await handleAuth(request, response);
}
