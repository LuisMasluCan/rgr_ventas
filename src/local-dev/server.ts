import "dotenv/config";
import express, {
  type ErrorRequestHandler,
  type Request,
  type RequestHandler,
} from "express";
import type { ApiHandler, ApiRequest } from "../serverless/handler";
import { handleClientes } from "../../api/clientes";
import { handleCotizaciones } from "../../api/cotizaciones";
import { handleAuth } from "../../api/auth";
import { handleHealth } from "../../api/health";
import { handleMaquinarias } from "../../api/maquinarias";
import { prisma } from "../lib/prisma";

function toApiRequest(request: Request): ApiRequest {
  const url = new URL(request.originalUrl, "http://localhost");
  const query: ApiRequest["query"] = {};

  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    query[key] = values.length > 1 ? values : values[0];
  }

  return {
    method: request.method,
    query,
    body: request.body,
    headers: { cookie: request.headers.cookie },
  };
}

function route(handler: ApiHandler): RequestHandler {
  return (request, response, next) => {
    void handler(toApiRequest(request), response).catch(next);
  };
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "4mb" }));

app.all("/api/health", route(handleHealth));
app.all("/api/auth", route(handleAuth));
app.all("/api/clientes", route(handleClientes));
app.all("/api/maquinarias", route(handleMaquinarias));
app.all("/api/cotizaciones", route(handleCotizaciones));

const expressErrorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error("Error en el servidor local de API:", error);
  if (response.headersSent) return;

  const status = typeof error === "object" && error !== null && "status" in error
    && typeof error.status === "number" && error.status >= 400 && error.status < 500
    ? error.status
    : 500;
  response.status(status).json({
    error: status === 413
      ? "La solicitud es demasiado grande. Reduce el tamaño de las imágenes."
      : status === 400
        ? "El cuerpo de la solicitud no contiene JSON válido."
        : "Ocurrió un error interno en la API local.",
  });
};

app.use(expressErrorHandler);

const port = Number(process.env.API_PORT ?? 3001);

async function startServer() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL en el archivo .env de la raíz del proyecto.");
  }

  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;

  app.listen(port, "127.0.0.1", () => {
    console.log(`API local conectada a Neon en http://127.0.0.1:${port}`);
  });
}

void startServer().catch(async (error: unknown) => {
  console.error("No se pudo iniciar la API local ni conectar con Neon.", error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
