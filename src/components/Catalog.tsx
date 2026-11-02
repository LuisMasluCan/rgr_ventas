import { useState } from "react";
import { ArrowUpRight, Check, Clock3, Gauge, Pencil, Plus, Trash2, Weight } from "lucide-react";
import { formatCurrency } from "../mockData";
import type { Machine } from "../types";

interface CatalogProps {
  machines: Machine[];
  onAddMachine: () => void;
  onEditMachine: (machine: Machine) => void;
  onDeleteMachine: (machine: Machine) => Promise<void>;
  onGenerateQuotation: (machine: Machine) => void;
}

export default function Catalog({ machines, onAddMachine, onEditMachine, onDeleteMachine, onGenerateQuotation }: CatalogProps) {
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  const removeMachine = async (machine: Machine) => {
    if (!window.confirm(`¿Eliminar ${machine.name} (${machine.brand} ${machine.model})? Si tiene cotizaciones relacionadas, no se podrá eliminar.`)) return;
    setDeletingId(machine.id);
    setError("");
    try {
      await onDeleteMachine(machine);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la maquinaria.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <section>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-500">Inventario / Maquinaria</p>
          <h1 className="text-2xl font-bold tracking-tight text-corporate-blue sm:text-3xl">Catálogo de maquinaria</h1>
          <p className="mt-2 text-sm text-slate-500">Equipos disponibles para acompañar cada proyecto.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-soft sm:inline-flex">
            {machines.length} equipos en catálogo
          </span>
          <button type="button" onClick={onAddMachine} className="inline-flex items-center gap-2 rounded-xl bg-corporate-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600">
            <Plus size={17} /> Agregar Maquinaria
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {machines.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-500">Aún no hay maquinaria. Agrega el primer equipo al inventario.</div>}
      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {machines.map((machine) => {
          const available = machine.availability === "Disponible" && machine.quantity > 0;
          const availabilityLabel = machine.quantity === 0 ? "Sin unidades" : machine.availability;
          const additionalSpecifications = machine.especificacionesAdicionales ?? [];
          return (
            <article key={machine.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="relative h-52 overflow-hidden rounded-t-2xl bg-white p-4">
                <img src={machine.image} alt={machine.name} className="h-full w-full object-contain" />
                <span className={`absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${available ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                  {available ? <Check size={14} /> : <Clock3 size={14} />}
                  {availabilityLabel}
                </span>
                <span className="absolute bottom-4 left-4 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-600 backdrop-blur">
                  {machine.category}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{machine.brand}</p>
                    <h2 className="mt-1 text-lg font-bold text-corporate-dark">{machine.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">Modelo {machine.model}</p>
                  </div>
                  <div className="text-right">
                    <p className="whitespace-nowrap text-lg font-bold text-corporate-blue">{formatCurrency(machine.price)}</p>
                    <div className="mt-2 flex justify-end gap-1">
                      <button type="button" onClick={() => onEditMachine(machine)} aria-label={`Editar ${machine.name}`} title="Editar maquinaria" className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-corporate-blue"><Pencil size={16} /></button>
                      <button type="button" onClick={() => void removeMachine(machine)} disabled={deletingId === machine.id} aria-label={`Eliminar ${machine.name}`} title="Eliminar maquinaria" className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-50"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>

                <div className="my-5 grid grid-cols-3 gap-2 border-y border-slate-100 py-4">
                  <div>
                    <p className="text-xs text-slate-400">Motor</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-700">{machine.engine}</p>
                  </div>
                  <div className="border-x border-slate-100 px-3">
                    <p className="flex items-center gap-1 text-xs text-slate-400"><Gauge size={13} /> Potencia</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{machine.horsepower} HP</p>
                  </div>
                  <div className="pl-1">
                    <p className="flex items-center gap-1 text-xs text-slate-400"><Weight size={13} /> Peso</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{machine.weight ? `${machine.weight.toLocaleString("es-PE")} kg` : "Consultar"}</p>
                  </div>
                </div>
                {additionalSpecifications.length > 0 && <dl className="mb-4 space-y-2">
                  {additionalSpecifications.map((specification, index) => (
                    <div key={`${specification.titulo}-${index}`} className="flex justify-between gap-3 text-sm">
                      <dt className="text-slate-500">{specification.titulo}</dt>
                      <dd className="text-right font-semibold text-slate-700">{specification.valor}</dd>
                    </div>
                  ))}
                </dl>}
                <p className={`mb-4 text-sm font-semibold ${machine.quantity > 0 ? "text-slate-600" : "text-red-600"}`}>
                  Unidades disponibles: {machine.quantity}
                </p>

                <button
                  type="button"
                  onClick={() => onGenerateQuotation(machine)}
                  disabled={machine.quantity <= 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-corporate-green px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-600 focus:outline-none focus:ring-4 focus:ring-green-100"
                >
                  {machine.quantity > 0 ? "Generar cotización" : "Sin unidades disponibles"} <ArrowUpRight size={17} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
