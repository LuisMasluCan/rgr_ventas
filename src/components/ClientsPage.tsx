import { useState } from "react";
import { Building2, FileText, Pencil, Phone, Plus, Trash2, UserRound } from "lucide-react";
import type { Client } from "../types";

interface ClientsPageProps {
  clients: Client[];
  onAddClient: () => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (client: Client) => Promise<void>;
}

export default function ClientsPage({ clients, onAddClient, onEditClient, onDeleteClient }: ClientsPageProps) {
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  const removeClient = async (client: Client) => {
    if (!window.confirm(`¿Eliminar a ${client.name} (${client.company})? Si tiene cotizaciones relacionadas, no se podrá eliminar.`)) return;
    setDeletingId(client.id);
    setError("");
    try {
      await onDeleteClient(client);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el cliente.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <section>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-500">Ventas / Directorio</p>
          <h1 className="text-2xl font-bold tracking-tight text-corporate-blue sm:text-3xl">Clientes</h1>
          <p className="mt-2 text-sm text-slate-500">Contactos y empresas registrados para cotizaciones.</p>
        </div>
        <button type="button" onClick={onAddClient} className="inline-flex items-center gap-2 rounded-xl bg-corporate-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600">
          <Plus size={17} /> Agregar Cliente
        </button>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {clients.length === 0
        ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-500">Aún no hay clientes registrados. Agrega el primer contacto.</div>
        : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <article key={client.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-corporate-blue"><UserRound size={20} /></span>
                  <div className="min-w-0"><h2 className="truncate font-bold text-slate-800">{client.name}</h2><p className="mt-0.5 text-xs text-slate-400">Contacto</p></div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => onEditClient(client)} aria-label={`Editar ${client.name}`} title="Editar cliente" className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-corporate-blue"><Pencil size={16} /></button>
                  <button type="button" onClick={() => void removeClient(client)} disabled={deletingId === client.id} aria-label={`Eliminar ${client.name}`} title="Eliminar cliente" className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-50"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
                <p className="flex items-center gap-2 text-slate-600"><Building2 size={16} className="text-slate-400" />{client.company}</p>
                <p className="flex items-center gap-2 text-slate-600"><FileText size={16} className="text-slate-400" />DNI/RUC: {client.documento || "No registrado"}</p>
                <p className="flex items-center gap-2 text-slate-600"><Phone size={16} className="text-slate-400" />{client.phone}</p>
              </div>
            </article>
          ))}
        </div>}
    </section>
  );
}
