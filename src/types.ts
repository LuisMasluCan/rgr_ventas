export type Availability = "Disponible" | "En Tránsito" | "Vendido";
export type LeadStage = "Cotización" | "Asignados" | "Contactados" | "Cierre";
export type QuotationStatus = "En revisión" | "Enviada" | "Aprobada";

export const DEFAULT_QUOTATION_DESCRIPTION = [
  "Forma de Pago: Al Contado",
  "Plazo de Entrega: CONSULTAR",
  "Validez de la Oferta: 02 días calendarios",
  "Garantía: 2 años o 2,000 horas, lo que ocurra primero",
  "Lugar de Entrega: En nuestros almacenes de PUCALLPA",
].join("\n");

export interface Machine {
  id: string;
  name: string;
  brand: string;
  model: string;
  price: number;
  engine: string;
  horsepower: number;
  weight?: number;
  availability: Availability;
  quantity: number;
  image: string;
  imagenFichaTecnica?: string;
  photos?: string[];
  category: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  phone: string;
  documento: string;
}

export interface Lead {
  id: string;
  clientId: string;
  machineId: string;
  stage: LeadStage;
  date: string;
  value: number;
}

export interface Quotation {
  id: string;
  number: string;
  clientId: string;
  machineId: string;
  amount: number;
  status: QuotationStatus;
  date: string;
  fechaCotizacion: string;
  description: string;
}
