import { DEFAULT_QUOTATION_DESCRIPTION, type Client, type Lead, type LeadStage, type Machine, type Quotation } from "../types";

interface ApiClient {
  id: string;
  nombre: string;
  empresa: string;
  documento: string;
  telefono: string;
}

interface ApiMachine {
  id: string;
  nombre: string;
  categoria: string;
  marca: string;
  modelo: string;
  precio: number | string;
  imagenUrl: string;
  fichaTecnicaUrl: string | null;
  fotosDetalle: string[];
  cantidad: number;
  motor: string;
  potencia: number | string;
  peso: number | string | null;
  capacidadCucharonDelantero: number | string | null;
  capacidadCucharonPosterior: number | string | null;
  estado: Machine["availability"];
}

interface ApiQuotation {
  id: string;
  clienteId: string;
  maquinariaId: string;
  estado: LeadStage;
  fechaCotizacion: string;
  notas: string | null;
  descripcion: string | null;
  cliente: ApiClient;
  maquinaria: ApiMachine;
}

interface MappedQuotation {
  lead: Lead;
  quotation: Quotation;
}

export interface SalesData {
  clients: Client[];
  machines: Machine[];
  leads: Lead[];
  quotations: Quotation[];
}

export interface ClientInput {
  name: string;
  company: string;
  documento: string;
  phone: string;
}

export type MachineInput = Omit<Machine, "id">;

function mapClient(client: ApiClient): Client {
  return {
    id: client.id,
    name: client.nombre,
    company: client.empresa,
    documento: client.documento,
    phone: client.telefono,
  };
}

function mapMachine(machine: ApiMachine): Machine {
  return {
    id: machine.id,
    name: machine.nombre,
    category: machine.categoria,
    brand: machine.marca,
    model: machine.modelo,
    price: Number(machine.precio),
    image: machine.imagenUrl,
    imagenFichaTecnica: machine.fichaTecnicaUrl ?? undefined,
    photos: machine.fotosDetalle ?? [],
    quantity: machine.cantidad ?? 1,
    engine: machine.motor,
    horsepower: Number(machine.potencia),
    weight: machine.peso === null ? undefined : Number(machine.peso),
    frontBucketCapacity: machine.capacidadCucharonDelantero === null
      ? undefined
      : Number(machine.capacidadCucharonDelantero),
    rearBucketCapacity: machine.capacidadCucharonPosterior === null
      ? undefined
      : Number(machine.capacidadCucharonPosterior),
    availability: machine.estado,
  };
}

function mapQuotation(quote: ApiQuotation): MappedQuotation {
  const date = new Date(quote.fechaCotizacion);
  const amount = Number(quote.maquinaria.precio);
  return {
    lead: {
      id: quote.id,
      clientId: quote.clienteId,
      machineId: quote.maquinariaId,
      stage: quote.estado,
      date: date.toLocaleDateString("es-PE"),
      value: amount,
    },
    quotation: {
      id: quote.id,
      number: quote.notas || `RGR-${quote.id.slice(0, 8)}`,
      clientId: quote.clienteId,
      machineId: quote.maquinariaId,
      amount,
      status: quote.estado === "Cierre" ? "Aprobada" : "En revisión",
      date: date.toLocaleDateString("es-PE"),
      fechaCotizacion: quote.fechaCotizacion,
      description: quote.descripcion ?? DEFAULT_QUOTATION_DESCRIPTION,
    },
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error(
      "No se pudo conectar con la API local. Inicia el proyecto desde la raíz con «npm run dev» y confirma que el servidor local de API esté escuchando en el puerto 3001.",
    );
  }
  const responseText = await response.text();
  let body: unknown;
  if (responseText) {
    try {
      body = JSON.parse(responseText) as unknown;
    } catch {
      const contentType = response.headers.get("content-type") ?? "desconocido";
      throw new Error(
        `La API respondió con un formato no JSON (${contentType}, HTTP ${response.status}). Reinicia con «npm run dev» y confirma que la API local esté activa.`,
      );
    }
  }

  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
      ? body.error
      : `Error HTTP ${response.status}`;
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  if (body === undefined) {
    throw new Error("La API devolvió una respuesta vacía cuando se esperaba JSON.");
  }
  return body as T;
}

export async function getAuthStatus(): Promise<{ authenticated: boolean }> {
  return request("/api/auth");
}

export async function login(email: string, password: string): Promise<void> {
  await request("/api/auth", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<void> {
  await request<void>("/api/auth", { method: "DELETE" });
}

export async function getSalesData(): Promise<SalesData> {
  const [clientRows, machineRows, quotationRows] = await Promise.all([
    request<ApiClient[]>("/api/clientes"),
    request<ApiMachine[]>("/api/maquinarias"),
    request<ApiQuotation[]>("/api/cotizaciones"),
  ]);
  const mappedQuotations = quotationRows.map(mapQuotation);
  return {
    clients: clientRows.map(mapClient),
    machines: machineRows.map(mapMachine),
    leads: mappedQuotations.map(({ lead }) => lead),
    quotations: mappedQuotations.map(({ quotation }) => quotation),
  };
}

export async function createClient(client: ClientInput): Promise<Client> {
  const created = await request<ApiClient>("/api/clientes", {
    method: "POST",
    body: JSON.stringify({
      nombre: client.name,
      empresa: client.company,
      documento: client.documento,
      telefono: client.phone,
    }),
  });
  return mapClient(created);
}

export async function updateClient(id: string, client: ClientInput): Promise<Client> {
  const updated = await request<ApiClient>(`/api/clientes?id=${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      nombre: client.name,
      empresa: client.company,
      documento: client.documento,
      telefono: client.phone,
    }),
  });
  return mapClient(updated);
}

export async function deleteClient(id: string): Promise<void> {
  await request<void>(`/api/clientes?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function createMachine(machine: MachineInput): Promise<Machine> {
  const created = await request<ApiMachine>("/api/maquinarias", {
    method: "POST",
    body: JSON.stringify(toApiMachine(machine)),
  });
  return mapMachine(created);
}

function toApiMachine(machine: MachineInput) {
  return {
    nombre: machine.name,
    categoria: machine.category,
    marca: machine.brand,
    modelo: machine.model,
    precio: machine.price,
    imagenUrl: machine.image,
    fichaTecnicaUrl: machine.imagenFichaTecnica ?? null,
    fotosDetalle: machine.photos ?? [],
    cantidad: machine.quantity,
    motor: machine.engine,
    potencia: machine.horsepower,
    peso: machine.weight ?? null,
    capacidadCucharonDelantero: machine.frontBucketCapacity ?? null,
    capacidadCucharonPosterior: machine.rearBucketCapacity ?? null,
    estado: machine.availability,
  };
}

export async function updateMachine(id: string, machine: MachineInput): Promise<Machine> {
  const updated = await request<ApiMachine>(`/api/maquinarias?id=${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(toApiMachine(machine)),
  });
  return mapMachine(updated);
}

export async function deleteMachine(id: string): Promise<void> {
  await request<void>(`/api/maquinarias?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function createQuotation(input: {
  clientId: string;
  machineId: string;
  number: string;
  description: string;
}): Promise<MappedQuotation> {
  const created = await request<ApiQuotation>("/api/cotizaciones", {
    method: "POST",
    body: JSON.stringify({
      clienteId: input.clientId,
      maquinariaId: input.machineId,
      estado: "Cotización",
      notas: input.number,
      descripcion: input.description,
    }),
  });
  return mapQuotation(created);
}

export async function updateQuotationDetails(id: string, clientId: string, description: string): Promise<void> {
  await request(`/api/cotizaciones?id=${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ clienteId: clientId, descripcion: description }),
  });
}

export async function deleteQuotation(id: string): Promise<void> {
  await request<void>(`/api/cotizaciones?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function updateQuotationStage(id: string, estado: LeadStage): Promise<void> {
  await request(`/api/cotizaciones?id=${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ estado }),
  });
}
