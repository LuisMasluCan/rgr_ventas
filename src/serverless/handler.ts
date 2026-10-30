export interface ApiRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): ApiResponse;
  end(): ApiResponse;
  setHeader(name: string, value: string): ApiResponse;
}

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export type ApiHandler = (req: ApiRequest, res: ApiResponse) => Promise<void>;

export function withErrorHandling(handler: ApiHandler) {
  return async (req: ApiRequest, res: ApiResponse): Promise<void> => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.status).json({ error: error.message });
        return;
      }

      if (isRecord(error) && error.code === "P2002") {
        res.status(409).json({ error: "Ya existe un cliente con ese documento." });
        return;
      }
      if (isRecord(error) && error.code === "P2003") {
        res.status(409).json({ error: "El registro está relacionado con cotizaciones existentes." });
        return;
      }
      if (isRecord(error) && error.code === "P2025") {
        res.status(404).json({ error: "No se encontró el registro solicitado." });
        return;
      }

      console.error("Error al procesar la solicitud de la API:", error);
      res.status(500).json({ error: "Ocurrió un error interno al procesar la solicitud." });
    }
  };
}

export function requireMethod(req: ApiRequest, allowed: string[]): void {
  if (!req.method || !allowed.includes(req.method)) {
    throw new HttpError(405, `Método no permitido. Usa: ${allowed.join(", ")}.`);
  }
}

export function bodyRecord(req: ApiRequest): Record<string, unknown> {
  const body: unknown = req.body;
  if (!isRecord(body)) {
    throw new HttpError(400, "El cuerpo de la solicitud debe ser un objeto JSON.");
  }
  return body;
}

export function requiredString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `El campo "${key}" es obligatorio.`);
  }
  return value.trim();
}

export function requiredNumber(body: Record<string, unknown>, key: string, positive = false): number {
  const value = body[key];
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || (positive && parsed <= 0)) {
    throw new HttpError(400, `El campo "${key}" debe ser un número${positive ? " mayor que cero" : ""}.`);
  }
  return parsed;
}

export function nullableNumber(body: Record<string, unknown>, key: string): number | null {
  const value = body[key];
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new HttpError(400, `El campo "${key}" debe ser un número no negativo.`);
  }
  return parsed;
}

export function requiredId(req: ApiRequest): string {
  const value = req.query.id;
  const id = typeof value === "string" ? value : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new HttpError(400, "Incluye un UUID válido en el parámetro ?id=.");
  }
  return id;
}

export function requiredUuid(body: Record<string, unknown>, key: string): string {
  const id = requiredString(body, key);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new HttpError(400, `El campo "${key}" debe ser un UUID válido.`);
  }
  return id;
}

export function enumValue<T extends readonly string[]>(value: unknown, values: T, field: string): T[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new HttpError(400, `El valor de "${field}" no es válido.`);
  }
  return value as T[number];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
