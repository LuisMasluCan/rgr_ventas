import { ArrowLeft, ArrowRight, CalendarDays, MessageCircle, MoreHorizontal } from "lucide-react";
import { formatCurrency } from "../mockData";
import type { Client, Lead, LeadStage, Machine, Quotation } from "../types";
import { getFollowUpReminder } from "../lib/followUp";

interface KanbanProps {
  leads: Lead[];
  clients: Client[];
  machines: Machine[];
  quotations: Quotation[];
  onMoveLead: (leadId: string, stage: LeadStage) => void;
}

const stages: LeadStage[] = ["Cotización", "Asignados", "Contactados", "Cierre"];
const stageColors = ["bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-corporate-green"];
const avatarColors = ["bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-violet-100 text-violet-700", "bg-orange-100 text-orange-700"];

export default function Kanban({ leads, clients, machines, quotations, onMoveLead }: KanbanProps) {
  return (
    <section>
      <div className="mb-7">
        <p className="mb-2 text-sm font-medium text-slate-500">Ventas / Seguimiento</p>
        <h1 className="text-2xl font-bold tracking-tight text-corporate-blue sm:text-3xl">Seguimiento de clientes</h1>
        <p className="mt-2 text-sm text-slate-500">Mantén cada oportunidad avanzando hacia el cierre.</p>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-4">
        {stages.map((stage, stageIndex) => {
          const stageLeads = leads.filter((lead) => lead.stage === stage);
          return (
            <div key={stage} className="min-h-72 rounded-2xl bg-slate-100/80 p-3.5">
              <div className="mb-4 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${stageColors[stageIndex]}`} />
                  <h2 className="text-sm font-bold text-slate-700">{stage}</h2>
                  <span className="rounded-md bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-500">{stageLeads.length}</span>
                </div>
                <button type="button" aria-label={`Opciones de ${stage}`} className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700"><MoreHorizontal size={19} /></button>
              </div>

              <div className="space-y-3">
                {stageLeads.map((lead, index) => {
                  const client = clients.find((item) => item.id === lead.clientId);
                  const machine = machines.find((item) => item.id === lead.machineId);
                  const quotation = quotations.find((item) => item.id === lead.id);
                  const reminder = quotation ? getFollowUpReminder(quotation.fechaCotizacion) : null;
                  const currentStageIndex = stages.indexOf(lead.stage);
                  const previousStage = stages[currentStageIndex - 1];
                  const nextStage = stages[currentStageIndex + 1];
                  if (!client) return null;
                  const initials = client.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
                  const phone = client.phone.replace(/\D/g, "");
                  const whatsappNumber = phone.startsWith("51") ? phone : `51${phone}`;
                  const whatsappMessage = `Hola ${client.name}, te contactamos de RGR Selva para dar seguimiento a tu interés en ${machine?.name ?? "nuestros equipos"}. ¿Podemos ayudarte con alguna consulta?`;
                  return (
                    <article key={lead.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-soft">
                      <div className="flex items-start gap-2.5">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColors[index % avatarColors.length]}`}>{initials}</span>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-slate-800">{client.name}</h3>
                          <p className="truncate text-xs text-slate-500">{client.company}</p>
                        </div>
                      </div>
                      <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Interés en</p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-700">{machine?.name ?? "Maquinaria"}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-corporate-blue">{formatCurrency(lead.value)}</span>
                        <span className="flex items-center gap-1 text-xs text-slate-400"><CalendarDays size={13} /> {lead.date}</span>
                      </div>
                      {reminder && <p className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${reminder.className}`} role="status">{reminder.label}</p>}
                      {phone && <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100">
                        <MessageCircle size={14} /> Escribir por WhatsApp
                      </a>}
                      {(previousStage || nextStage) && (
                        <div className="mt-3 flex gap-2">
                          {previousStage && (
                            <button type="button" onClick={() => onMoveLead(lead.id, previousStage)} className="inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-100 px-2 py-2 text-xs font-semibold text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-corporate-blue">
                              <ArrowLeft size={13} className="shrink-0" /><span className="truncate">Volver a {previousStage}</span>
                            </button>
                          )}
                          {nextStage && (
                            <button type="button" onClick={() => onMoveLead(lead.id, nextStage)} className="inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-100 px-2 py-2 text-xs font-semibold text-slate-500 transition hover:border-green-200 hover:bg-green-50 hover:text-green-700">
                              <span className="truncate">Avanzar a {nextStage}</span><ArrowRight size={13} className="shrink-0" />
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
                {stageLeads.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-xs text-slate-400">Sin oportunidades</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
