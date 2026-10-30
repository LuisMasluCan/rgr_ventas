import { useState, type FormEvent, type ChangeEvent } from "react";
import { X } from "lucide-react";
import type { Client } from "../types";

interface ClientFormProps {
  onClose: () => void;
  onSave: (client: Client) => Promise<Client>;
  initialClient?: Client;
}

export default function ClientForm({ onClose, onSave, initialClient }: ClientFormProps) {
  const [form, setForm] = useState({
    name: initialClient?.name ?? "",
    company: initialClient?.company ?? "",
    phone: initialClient?.phone ?? "",
    documento: initialClient?.documento ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const updateForm = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client: Client = {
      id: initialClient?.id ?? "",
      name: form.name.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      documento: form.documento.trim(),
    };
    setSaving(true);
    setError("");
    try {
      await onSave(client);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el cliente.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="client-form-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-7">
        <div className="mb-5 flex items-start justify-between">
          <div><p className="text-sm font-medium text-slate-400">Directorio</p><h2 id="client-form-title" className="mt-1 text-xl font-bold text-corporate-blue">{initialClient ? "Editar cliente" : "Agregar cliente"}</h2></div>
          <button type="button" onClick={onClose} aria-label="Cerrar formulario" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-600">Nombre del contacto<input required name="name" value={form.name} onChange={updateForm} className={inputClass} placeholder="Nombre y apellido" /></label>
          <label className="block text-sm font-semibold text-slate-600">Empresa<input required name="company" value={form.company} onChange={updateForm} className={inputClass} placeholder="Empresa o razón social" /></label>
          <label className="block text-sm font-semibold text-slate-600">DNI / RUC<input required name="documento" value={form.documento} onChange={updateForm} className={inputClass} placeholder="8 dígitos (DNI) o 11 dígitos (RUC)" inputMode="numeric" pattern="\d{8}|\d{11}" title="Ingresa un DNI de 8 dígitos o un RUC de 11 dígitos" maxLength={11} /></label>
          <label className="block text-sm font-semibold text-slate-600">Teléfono<input required name="phone" type="tel" value={form.phone} onChange={updateForm} className={inputClass} placeholder="+51 900 000 000" /></label>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-corporate-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:cursor-wait disabled:opacity-70">{saving ? "Guardando…" : initialClient ? "Guardar cambios" : "Guardar cliente"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
