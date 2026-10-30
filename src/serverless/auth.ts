import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { HttpError, type ApiRequest, type ApiResponse } from "./handler.js";

const cookieName = "rgr_session";
const sessionDurationSeconds = 8 * 60 * 60;

function getSessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new HttpError(503, "La sesión no está configurada correctamente en el servidor.");
  }
  return secret;
}

function getCredential(name: "AUTH_EMAIL" | "AUTH_PASSWORD"): string {
  const value = process.env[name];
  if (!value) {
    throw new HttpError(503, "El inicio de sesión no está configurado en el servidor.");
  }
  return value;
}

function safeEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function cookieValue(request: ApiRequest): string | undefined {
  const header = request.headers?.cookie;
  const cookieHeader = Array.isArray(header) ? header[0] : header;
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(";")) {
    const [name, ...parts] = cookie.trim().split("=");
    if (name === cookieName) return parts.join("=");
  }
  return undefined;
}

export function hasValidSession(request: ApiRequest): boolean {
  const value = cookieValue(request);
  if (!value) return false;

  const lastSeparator = value.lastIndexOf(".");
  if (lastSeparator < 1) return false;
  const payload = value.slice(0, lastSeparator);
  const suppliedSignature = value.slice(lastSeparator + 1);
  const expectedSignature = createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
  if (!safeEqual(suppliedSignature, expectedSignature)) return false;

  const expiresAt = Number(payload.slice(0, payload.indexOf(".")));
  return Number.isSafeInteger(expiresAt) && expiresAt > Math.floor(Date.now() / 1000);
}

export function requireAuthenticated(request: ApiRequest): void {
  if (!hasValidSession(request)) {
    throw new HttpError(401, "Inicia sesión para continuar.");
  }
}

export function verifyCredentials(email: unknown, password: unknown): boolean {
  const configuredEmail = getCredential("AUTH_EMAIL");
  const configuredPassword = getCredential("AUTH_PASSWORD");
  getSessionSecret();

  if (typeof email !== "string" || typeof password !== "string") return false;
  return safeEqual(email.trim().toLowerCase(), configuredEmail.trim().toLowerCase())
    && safeEqual(password, configuredPassword);
}

export function setSessionCookie(response: ApiResponse): void {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionDurationSeconds;
  const payload = `${expiresAt}.${randomBytes(16).toString("base64url")}`;
  const signature = createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `${cookieName}=${payload}.${signature}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${sessionDurationSeconds}${secure}`,
  );
}

export function clearSessionCookie(response: ApiResponse): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`,
  );
}
