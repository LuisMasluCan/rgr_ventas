import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Boxes,
  BriefcaseBusiness,
  CircleHelp,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  Search,
  Settings2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Catalog from "./components/Catalog";
import ClientForm from "./components/ClientForm";
import ClientsPage from "./components/ClientsPage";
import Kanban from "./components/Kanban";
import LoginPage from "./components/LoginPage";
import MachineForm from "./components/MachineForm";
import ProformaPDF from "./components/ProformaPDF";
import {
  createClient,
  createMachine,
  createQuotation,
  deleteClient,
  deleteMachine,
  deleteQuotation,
  getSalesData,
  getAuthStatus,
  login,
  logout,
  updateClient,
  updateMachine,
  updateQuotationDetails,
  updateQuotationStage,
} from "./lib/api";
import { getFollowUpReminder } from "./lib/followUp";
import { formatCurrency } from "./mockData";
import { DEFAULT_QUOTATION_DESCRIPTION, type Client, type Lead, type LeadStage, type Machine, type Quotation } from "./types";

type View = "dashboard" | "catalog" | "clients" | "kanban" | "quotations" | "proforma";
type Modal = "machine" | "client" | null;

const navigation = [
  { id: "dashboard" as const, label: "Resumen", icon: LayoutDashboard },
  { id: "catalog" as const, label: "Maquinaria", icon: PackageSearch },
  { id: "clients" as const, label: "Clientes", icon: Users },
  { id: "kanban" as const, label: "Seguimiento", icon: BriefcaseBusiness },
  { id: "quotations" as const, label: "Cotizaciones", icon: FileText },
];

function Logo() {
  return <img src="/logo-rgr.png" alt="RGR Vehículos y Maquinarias" className="h-auto w-[205px] object-contain" />;
}

function Dashboard({
  machines,
  clients,
  quotations,
  onNavigate,
  onGenerateQuotation,
}: {
  machines: Machine[];
  clients: Client[];
  quotations: Quotation[];
  onNavigate: (view: View) => void;
  onGenerateQuotation: (machine: Machine) => void;
}) {
  const recentQuotes = [...quotations].reverse().slice(0, 3);
  const availableMachines = machines.filter((machine) => machine.availability === "Disponible" && machine.quantity > 0).length;
  const stats = [
    { label: "Ventas cotizadas", value: formatCurrency(quotations.reduce((total, quote) => total + quote.amount, 0)), change: `${quotations.length} cotizaciones`, icon: BriefcaseBusiness, positive: true },
    { label: "Cotizaciones activas", value: String(quotations.filter((quote) => quote.status !== "Aprobada").length), change: "En seguimiento", icon: FileText, positive: true },
    { label: "Clientes registrados", value: String(clients.length), change: "En el directorio", icon: Users, positive: true },
    { label: "Equipos disponibles", value: String(availableMachines), change: `de ${machines.length} equipos`, icon: Boxes, positive: true },
  ];

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-500">{new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <h1 className="text-2xl font-bold tracking-tight text-corporate-blue sm:text-3xl">Resumen de ventas</h1>
          <p className="mt-2 text-sm text-slate-500">Actividad comercial e inventario de RGR Selva.</p>
        </div>
        <button onClick={() => onNavigate("catalog")} type="button" className="rounded-xl bg-corporate-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600">+ Nueva cotización</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-corporate-blue"><Icon size={19} /></span>
                <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><ArrowUpRight size={14} />{stat.change}</span>
              </div>
              <p className="mt-5 text-sm text-slate-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-corporate-dark">{stat.value}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start justify-between">
            <div><h2 className="font-bold text-slate-800">Cotizaciones recientes</h2><p className="mt-1 text-sm text-slate-500">Propuestas guardadas en la base de datos</p></div>
            <button type="button" onClick={() => onNavigate("quotations")} className="text-sm font-semibold text-corporate-blue hover:underline">Ver todas</button>
          </div>
          <div className="mt-5 divide-y divide-slate-100">
            {recentQuotes.map((quote) => {
              const client = clients.find((item) => item.id === quote.clientId);
              const machine = machines.find((item) => item.id === quote.machineId);
              return (
                <div key={quote.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-corporate-blue"><FileText size={18} /></span>
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{client?.company ?? "Cliente"}</p><p className="mt-1 truncate text-xs text-slate-500">{machine?.name ?? "Maquinaria"} · {quote.number}</p></div>
                  </div>
                  <div className="text-right"><p className="text-sm font-bold text-slate-800">{formatCurrency(quote.amount)}</p><span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${quote.status === "Aprobada" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{quote.status}</span></div>
                </div>
              );
            })}
            {recentQuotes.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Todavía no hay cotizaciones guardadas.</p>}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start justify-between">
            <div><h2 className="font-bold text-slate-800">Inventario destacado</h2><p className="mt-1 text-sm text-slate-500">Disponibilidad de equipos</p></div>
            <button type="button" onClick={() => onNavigate("catalog")} className="text-sm font-semibold text-corporate-blue hover:underline">Catálogo</button>
          </div>
          <div className="mt-5 space-y-3">
            {machines.slice(0, 3).map((machine) => (
              <div key={machine.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                <img src={machine.image} alt="" className="h-12 w-14 rounded-lg bg-white p-1 object-contain" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{machine.name}</p><p className="mt-1 text-xs text-slate-500">{formatCurrency(machine.price)}</p></div>
                <span className={`h-2 w-2 rounded-full ${machine.availability === "Disponible" ? "bg-corporate-green" : "bg-amber-400"}`} />
              </div>
            ))}
            {machines.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No hay equipos registrados.</p>}
          </div>
          {machines[0] && <button type="button" onClick={() => onGenerateQuotation(machines[0])} className="mt-4 w-full rounded-xl bg-slate-50 py-2.5 text-sm font-semibold text-corporate-blue transition hover:bg-green-50">Crear proforma de equipo</button>}
        </article>
      </div>
    </section>
  );
}

function QuotationsPage({
  quotations,
  clients,
  machines,
  onOpenQuotation,
  onDeleteQuotation,
}: {
  quotations: Quotation[];
  clients: Client[];
  machines: Machine[];
  onOpenQuotation: (quotation: Quotation) => void;
  onDeleteQuotation: (quotation: Quotation) => Promise<void>;
}) {
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  const removeQuotation = async (quotation: Quotation) => {
    if (!window.confirm(`¿Eliminar la cotización ${quotation.number}? Esta acción no se puede deshacer.`)) return;
    setDeletingId(quotation.id);
    setError("");
    try {
      await onDeleteQuotation(quotation);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la cotización.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <section>
      <div className="mb-7">
        <p className="mb-2 text-sm font-medium text-slate-500">Ventas / Documentos</p>
        <h1 className="text-2xl font-bold tracking-tight text-corporate-blue sm:text-3xl">Cotizaciones</h1>
        <p className="mt-2 text-sm text-slate-500">Historial de propuestas guardadas en la base de datos.</p>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr><th className="px-5 py-4">N° proforma</th><th className="px-5 py-4">Cliente</th><th className="px-5 py-4">Equipo</th><th className="px-5 py-4">Fecha</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4 text-right">Total</th><th className="px-5 py-4" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...quotations].reverse().map((quote) => {
                const client = clients.find((item) => item.id === quote.clientId);
                const machine = machines.find((item) => item.id === quote.machineId);
                return <tr key={quote.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-semibold text-corporate-blue">{quote.number}</td><td className="px-5 py-4 text-slate-700">{client?.company ?? "Cliente"}</td><td className="px-5 py-4 text-slate-500">{machine?.name ?? "Maquinaria"}</td><td className="px-5 py-4 text-slate-500">{quote.date}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${quote.status === "Aprobada" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{quote.status}</span></td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-800">{formatCurrency(quote.amount)}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button type="button" onClick={() => onOpenQuotation(quote)} className="font-semibold text-corporate-blue hover:underline">Abrir</button>
                      <button type="button" onClick={() => void removeQuotation(quote)} disabled={deletingId === quote.id} aria-label={`Eliminar cotización ${quote.number}`} title="Eliminar cotización" className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-50"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>;
              })}
              {quotations.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">No hay cotizaciones guardadas todavía.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [apiError, setApiError] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [modal, setModal] = useState<Modal>(null);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [editingMachine, setEditingMachine] = useState<Machine | undefined>();
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [quotationNumber, setQuotationNumber] = useState("");
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const selectedMachine = machines.find((machine) => machine.id === selectedMachineId);
  const followUpNotifications = leads.flatMap((lead) => {
    const quotation = quotations.find((item) => item.id === lead.id);
    const reminder = quotation ? getFollowUpReminder(quotation.fechaCotizacion) : null;
    const client = clients.find((item) => item.id === lead.clientId);
    if (!reminder || !client) return [];
    return [{
      id: lead.id,
      label: reminder.label,
      className: reminder.className,
      clientName: client.name,
      company: client.company,
      machineName: machines.find((item) => item.id === lead.machineId)?.name ?? "Maquinaria",
    }];
  });

  const refreshData = useCallback(async () => {
    const data = await getSalesData();
    setClients(data.clients);
    setMachines(data.machines);
    setLeads(data.leads);
    setQuotations(data.quotations);
    setApiError("");
  }, []);

  useEffect(() => {
    let active = true;
    void getAuthStatus()
      .then(async (session) => {
        if (!active) return;
        setAuthenticated(session.authenticated);
        if (session.authenticated) {
          try {
            await refreshData();
          } catch (error) {
            console.error("No se pudieron cargar los datos de la API.", error);
            if (active) setApiError(error instanceof Error ? error.message : "No se pudieron cargar los datos del servidor.");
          }
        }
      })
      .catch((error: unknown) => {
        console.error("No se pudo verificar la sesión.", error);
        if (active) setAuthError(error instanceof Error ? error.message : "No se pudo verificar la sesión.");
      })
      .finally(() => {
        if (active) {
          setAuthLoading(false);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [refreshData]);

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    setAuthError("");
    setApiError("");
    setAuthenticated(true);
    setLoading(true);
    try {
      await refreshData();
    } catch (error) {
      console.error("No se pudieron cargar los datos después del inicio de sesión.", error);
      setApiError(error instanceof Error ? error.message : "No se pudieron cargar los datos del servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setAuthenticated(false);
      setMachines([]);
      setClients([]);
      setLeads([]);
      setQuotations([]);
      setApiError("");
    } catch (error) {
      console.error("No se pudo cerrar la sesión.", error);
      setApiError(error instanceof Error ? error.message : "No se pudo cerrar la sesión.");
    }
  };

  const nextQuotationNumber = () => {
    const year = String(new Date().getFullYear()).slice(-2);
    const pattern = new RegExp(`^RGR N[°º.]?\\s*${year}-(\\d+)-G$`);
    const highestNumber = quotations.reduce((highest, quotation) => {
      const current = quotation.number.match(pattern);
      return current ? Math.max(highest, Number(current[1])) : highest;
    }, 0);
    return `RGR N° ${year}-${String(highestNumber + 1).padStart(3, "0")}-G`;
  };

  const openQuotation = (machine: Machine) => {
    if (machine.quantity <= 0) {
      setApiError(`No hay unidades disponibles de ${machine.name}.`);
      return;
    }
    if (clients.length === 0) {
      setView("clients");
      setModal("client");
      return;
    }
    setSelectedMachineId(machine.id);
    setSelectedClientId(clients[0].id);
    setQuotationNumber(nextQuotationNumber());
    setSelectedQuotationId(null);
    setView("proforma");
  };

  const openSavedQuotation = (quotation: Quotation) => {
    const machine = machines.find((item) => item.id === quotation.machineId);
    if (!machine) {
      console.error(`No se encontró la maquinaria de la cotización ${quotation.number}.`);
      return;
    }
    setSelectedMachineId(machine.id);
    setSelectedClientId(quotation.clientId);
    setQuotationNumber(quotation.number);
    setSelectedQuotationId(quotation.id);
    setView("proforma");
  };

  const saveMachine = async (machine: Machine) => {
    try {
      if (editingMachine) {
        const updated = await updateMachine(editingMachine.id, machine);
        setMachines((current) => current.map((item) => item.id === updated.id ? updated : item));
      } else {
        const created = await createMachine(machine);
        setMachines((current) => [...current, created]);
      }
      return true;
    } catch (error) {
      console.error("No se pudo guardar la maquinaria en la API.", error);
      throw error;
    }
  };
  const removeMachine = async (machine: Machine) => {
    await deleteMachine(machine.id);
    setMachines((current) => current.filter((item) => item.id !== machine.id));
  };
  const saveClient = async (client: Client) => {
    const saved = client.id
      ? await updateClient(client.id, client)
      : await createClient(client);
    setClients((current) => client.id
      ? current.map((item) => item.id === saved.id ? saved : item)
      : [...current, saved]);
    return saved;
  };

  const removeClient = async (client: Client) => {
    await deleteClient(client.id);
    setClients((current) => current.filter((item) => item.id !== client.id));
  };

  const removeQuotation = async (quotation: Quotation) => {
    await deleteQuotation(quotation.id);
    await refreshData();
  };

  const moveLead = async (leadId: string, stage: LeadStage) => {
    try {
      await updateQuotationStage(leadId, stage);
      await refreshData();
    } catch (error) {
      console.error("No se pudo actualizar la etapa de cotización.", error);
      setApiError(error instanceof Error ? error.message : "No se pudo actualizar el seguimiento.");
    }
  };

  const saveCurrentQuotation = async (client: Client, description: string) => {
    if (!selectedMachine) return false;
    const existingQuotation = selectedQuotationId
      ? quotations.find((quotation) => quotation.id === selectedQuotationId)
      : quotations.find((quotation) => quotation.number === quotationNumber);
    if (existingQuotation) {
      try {
        await updateQuotationDetails(existingQuotation.id, client.id, description);
        setSelectedQuotationId(existingQuotation.id);
        setQuotations((current) => current.map((quotation) =>
          quotation.id === existingQuotation.id
            ? { ...quotation, clientId: client.id, description }
            : quotation
        ));
        setLeads((current) => current.map((lead) =>
          lead.id === existingQuotation.id ? { ...lead, clientId: client.id } : lead
        ));
      } catch (error) {
        console.error("No se pudo guardar la descripción de la cotización.", error);
        setApiError(error instanceof Error ? error.message : "No se pudo guardar la descripción de la cotización.");
        return false;
      }
      return true;
    }
    try {
      const created = await createQuotation({ clientId: client.id, machineId: selectedMachine.id, number: quotationNumber, description });
      setLeads((current) => [...current, created.lead]);
      setQuotations((current) => [...current, created.quotation]);
      setSelectedQuotationId(created.quotation.id);
    } catch (error) {
      console.error("No se pudo guardar la cotización en la API.", error);
      setApiError(error instanceof Error ? error.message : "No se pudo guardar la cotización.");
      return false;
    }
    return true;
  };

  const pageTitle = view === "dashboard" ? "Resumen" : view === "proforma" ? "Proforma" : navigation.find((item) => item.id === view)?.label ?? "Resumen";

  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Verificando acceso…</main>;
  }
  if (!authenticated) return <LoginPage onLogin={handleLogin} serverError={authError} />;

  return (
    <div className="min-h-screen bg-slate-50">
      {mobileMenuOpen && <button aria-label="Cerrar menú" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-slate-200 bg-white px-5 py-6 shadow-sm transition-transform lg:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <Logo />
          <button type="button" aria-label="Cerrar menú" onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 lg:hidden"><X size={20} /></button>
        </div>

        <div className="mt-10">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Menú principal</p>
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = view === item.id || (view === "proforma" && item.id === "quotations");
              return <button key={item.id} type="button" onClick={() => { setView(item.id); setMobileMenuOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${active ? "bg-green-50 text-corporate-blue" : "text-slate-600 hover:bg-slate-50 hover:text-corporate-blue"}`}>
                <Icon size={18} className={active ? "text-corporate-green" : ""} />{item.label}
                {item.id === "quotations" && quotations.length > 0 && <span className="ml-auto rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{quotations.length}</span>}
              </button>;
            })}
          </nav>
        </div>

        <div className="mt-9">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Administración</p>
          <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-corporate-blue"><Settings2 size={18} /> Configuración</button>
          <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-corporate-blue"><CircleHelp size={18} /> Centro de ayuda</button>
        </div>

        <div className="mt-auto rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-corporate-green"><Boxes size={18} /></span>
          <p className="mt-3 text-sm font-semibold text-slate-800">¿Necesitas ayuda?</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Nuestro equipo está listo para ayudarte.</p>
          <a
            href="https://wa.me/51974449127?text=Hola%2C%20necesito%20ayuda%20con%20el%20sistema%20de%20ventas%20RGR%20Selva."
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs font-semibold text-corporate-green hover:text-green-700"
          >
            Contactar soporte →
          </a>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-100 bg-white/90 px-4 backdrop-blur sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Abrir menú" onClick={() => setMobileMenuOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={20} /></button>
            <div className="hidden items-center gap-2 text-sm text-slate-400 sm:flex"><span>RGR Selva</span><span>/</span><span className="font-semibold text-slate-700">{pageTitle}</span></div>
            <span className="font-semibold text-slate-700 sm:hidden">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <label className="hidden h-10 w-56 items-center gap-2 rounded-xl bg-slate-50 px-3 text-slate-400 md:flex">
              <Search size={16} /><input placeholder="Buscar..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px]">⌘ K</kbd>
            </label>
            <div className="relative">
              <button type="button" aria-label={`Notificaciones${followUpNotifications.length ? `: ${followUpNotifications.length} pendientes` : ""}`} aria-expanded={showNotifications} aria-controls="follow-up-notifications" onClick={() => setShowNotifications((current) => !current)} className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-50">
                <Bell size={19} />
                {followUpNotifications.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-corporate-green px-1 text-[10px] font-bold text-white">{followUpNotifications.length > 9 ? "9+" : followUpNotifications.length}</span>}
              </button>
              {showNotifications && <div id="follow-up-notifications" role="dialog" aria-label="Notificaciones de seguimiento" className="absolute right-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-bold text-slate-800">Seguimientos pendientes</p>
                  <p className="mt-0.5 text-xs text-slate-500">{followUpNotifications.length} recordatorios por revisar</p>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {followUpNotifications.length > 0
                    ? followUpNotifications.map((notification) => <button key={notification.id} type="button" onClick={() => { setView("kanban"); setMobileMenuOpen(false); setShowNotifications(false); }} className="block w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${notification.className}`}>{notification.label}</span>
                      <span className="mt-1 block truncate text-sm font-semibold text-slate-800">{notification.clientName}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{notification.company} · {notification.machineName}</span>
                    </button>)
                    : <p className="px-3 py-6 text-center text-sm text-slate-500">No hay seguimientos pendientes.</p>}
                </div>
                {followUpNotifications.length > 0 && <button type="button" onClick={() => { setView("kanban"); setMobileMenuOpen(false); setShowNotifications(false); }} className="w-full border-t border-slate-100 px-4 py-3 text-center text-xs font-semibold text-corporate-blue hover:bg-slate-50">Ver seguimiento</button>}
              </div>}
            </div>
            <span className="hidden h-8 w-px bg-slate-200 sm:block" />
            <button type="button" onClick={() => void handleLogout()} aria-label="Cerrar sesión" title="Cerrar sesión" className="flex items-center gap-2 rounded-xl p-1.5 pr-1 text-left hover:bg-slate-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-corporate-blue">AR</span>
              <span className="hidden sm:block"><span className="block text-xs font-bold text-slate-700">Admin RGR</span><span className="mt-0.5 block text-[10px] text-slate-400">Cerrar sesión</span></span>
              <LogOut size={15} className="hidden text-slate-400 sm:block" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-7 lg:px-9 lg:py-9">
          {apiError && <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{apiError}</span><button type="button" onClick={() => { setLoading(true); void refreshData().catch((error: unknown) => setApiError(error instanceof Error ? error.message : "No se pudo conectar con el servidor.")).finally(() => setLoading(false)); }} className="shrink-0 font-semibold underline">Reintentar</button></div>}
          {loading && <div role="status" className="mb-5 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-600">Cargando datos desde el servidor…</div>}
          {view === "dashboard" && <Dashboard machines={machines} clients={clients} quotations={quotations} onNavigate={setView} onGenerateQuotation={openQuotation} />}
          {view === "catalog" && <Catalog machines={machines} onAddMachine={() => { setEditingMachine(undefined); setModal("machine"); }} onEditMachine={(machine) => { setEditingMachine(machine); setModal("machine"); }} onDeleteMachine={removeMachine} onGenerateQuotation={openQuotation} />}
          {view === "clients" && <ClientsPage clients={clients} onAddClient={() => { setEditingClient(undefined); setModal("client"); }} onEditClient={(client) => { setEditingClient(client); setModal("client"); }} onDeleteClient={removeClient} />}
          {view === "kanban" && <Kanban leads={leads} clients={clients} machines={machines} quotations={quotations} onMoveLead={moveLead} />}
          {view === "quotations" && <QuotationsPage quotations={quotations} clients={clients} machines={machines} onOpenQuotation={openSavedQuotation} onDeleteQuotation={removeQuotation} />}
          {view === "proforma" && selectedMachine && <ProformaPDF machine={selectedMachine} clients={clients} initialClientId={selectedClientId} quotationNumber={quotationNumber} initialDescription={quotations.find((quotation) => quotation.id === selectedQuotationId)?.description ?? DEFAULT_QUOTATION_DESCRIPTION} onBack={() => setView("catalog")} onSaveQuotation={saveCurrentQuotation} />}
        </main>
      </div>

      {modal === "machine" && <MachineForm initialMachine={editingMachine} onClose={() => { setModal(null); setEditingMachine(undefined); }} onSave={saveMachine} />}
      {modal === "client" && <ClientForm initialClient={editingClient} onClose={() => { setModal(null); setEditingClient(undefined); }} onSave={saveClient} />}
    </div>
  );
}
