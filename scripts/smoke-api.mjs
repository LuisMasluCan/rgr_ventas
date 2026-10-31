import "dotenv/config";

const baseUrl = (process.env.API_BASE_URL ?? "http://127.0.0.1:5173").replace(/\/+$/, "");
const email = process.env.AUTH_EMAIL;
const password = process.env.AUTH_PASSWORD;
if (!email || !password) throw new Error("Configura AUTH_EMAIL y AUTH_PASSWORD para ejecutar las pruebas API.");
let sessionCookie = "";

async function getJson(path) {
  const response = await fetch(new URL(path, `${baseUrl}/`), {
    headers: { Accept: "application/json", ...(sessionCookie ? { Cookie: sessionCookie } : {}) },
    signal: AbortSignal.timeout(45_000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(`${path}: se esperaba JSON y llegó "${contentType}" (HTTP ${response.status}).`);
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${path}: la respuesta no contiene JSON válido.`);
  }

  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status}: ${body?.error ?? "error desconocido"}`);
  }

  return body;
}

async function postJson(path, payload) {
  const response = await fetch(new URL(path, `${baseUrl}/`), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45_000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.json();

  if (!contentType.includes("application/json") || response.status !== 400 || typeof body.error !== "string") {
    throw new Error(`${path}: la validación esperada no devolvió HTTP 400 con error JSON.`);
  }
  return body.error;
}

const health = await getJson("/api/health");
if (health.ok !== true || health.database !== "connected") {
  throw new Error("/api/health: Neon no confirmó la conexión.");
}

const unauthenticatedResponse = await fetch(new URL("/api/clientes", `${baseUrl}/`));
if (unauthenticatedResponse.status !== 401) {
  throw new Error("/api/clientes: se esperaba HTTP 401 sin sesión.");
}
console.log("OK API protegida: solicitudes sin sesión reciben HTTP 401");

const loginResponse = await fetch(new URL("/api/auth", `${baseUrl}/`), {
  method: "POST",
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
if (!loginResponse.ok) {
  throw new Error(`Inicio de sesión de prueba falló: HTTP ${loginResponse.status}.`);
}
const cookie = loginResponse.headers.get("set-cookie") ?? "";
const cookieMatch = cookie.match(/(?:^|,\s*)rgr_session=([^;,\s]+)/);
if (!cookieMatch) throw new Error("El login no devolvió la cookie de sesión.");
sessionCookie = `rgr_session=${cookieMatch[1]}`;
console.log("OK login: credenciales aceptadas y sesión creada");

for (const path of ["/api/clientes", "/api/maquinarias", "/api/cotizaciones"]) {
  const body = await getJson(path);
  if (!Array.isArray(body)) {
    throw new Error(`${path}: se esperaba una lista JSON.`);
  }
  if (path === "/api/maquinarias" && body.some((machine) =>
    typeof machine.categoria !== "string" || !machine.categoria.trim() ||
    !Array.isArray(machine.fotosDetalle) || !Number.isInteger(machine.cantidad) || machine.cantidad < 0
  )) {
    throw new Error(`${path}: cada maquinaria debe incluir categoría, fotos y una cantidad válida.`);
  }
  console.log(`OK ${path}: ${body.length} registro(s)`);
}

await postJson("/api/clientes", { nombre: "Smoke test", empresa: "No guardar", documento: "invalid", telefono: "000" });
console.log("OK validación POST: documento inválido rechazado sin insertar datos");
const photoError = await postJson("/api/maquinarias", {
  nombre: "Smoke test",
  marca: "No guardar",
  modelo: "TEST",
  precio: 1,
  imagenUrl: "https://example.invalid/equipo.jpg",
  motor: "TEST",
  potencia: 1,
  fotosDetalle: Array(8).fill("data:image/jpeg;base64,AA=="),
});
if (!photoError.includes("hasta 7")) throw new Error(`/api/maquinarias: validación inesperada para más de 7 fotos: ${photoError}`);
console.log("OK validación de fotos: más de 7 imágenes rechazadas sin insertar datos");
await postJson("/api/maquinarias", {
  nombre: "Smoke test",
  marca: "No guardar",
  modelo: "TEST",
  precio: 1,
  imagenUrl: "https://example.invalid/equipo.jpg",
  motor: "TEST",
  potencia: 1,
  cantidad: -1,
});
console.log("OK validación de inventario: cantidades negativas rechazadas sin insertar datos");

const logoutResponse = await fetch(new URL("/api/auth", `${baseUrl}/`), {
  method: "DELETE",
  headers: { Cookie: sessionCookie },
});
if (logoutResponse.status !== 204) throw new Error(`Cierre de sesión falló: HTTP ${logoutResponse.status}.`);
sessionCookie = "";
const loggedOutResponse = await fetch(new URL("/api/clientes", `${baseUrl}/`));
if (loggedOutResponse.status !== 401) throw new Error("La sesión continuó activa después de cerrar sesión.");
console.log("OK logout: la API vuelve a rechazar solicitudes sin sesión");
console.log(`Conexión a Neon verificada en ${baseUrl}`);
