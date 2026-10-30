import { useState, type FormEvent, type ChangeEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import type { Availability, Machine } from "../types";
import { compressImage, compressImageDataUrl } from "../lib/imageCompression";

const photoLabels = ["Frontal", "Posterior", "Lateral izquierda", "Lateral derecha", "Interior 1", "Interior 2", "Foto del local"];

interface MachineFormProps {
  onClose: () => void;
  onSave: (machine: Machine) => Promise<boolean>;
  initialMachine?: Machine;
}

const emptyForm = {
  name: "",
  brand: "",
  model: "",
  price: "",
  engine: "",
  horsepower: "",
  weight: "",
  frontBucketCapacity: "",
  rearBucketCapacity: "",
  availability: "Disponible" as Availability,
  quantity: "",
  category: "",
  imageUrl: "",
  imageFichaTecnicaUrl: "",
};

export default function MachineForm({ onClose, onSave, initialMachine }: MachineFormProps) {
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    name: initialMachine?.name ?? "",
    brand: initialMachine?.brand ?? "",
    model: initialMachine?.model ?? "",
    price: initialMachine ? String(initialMachine.price) : "",
    engine: initialMachine?.engine ?? "",
    horsepower: initialMachine ? String(initialMachine.horsepower) : "",
    weight: initialMachine?.weight === undefined ? "" : String(initialMachine.weight),
    frontBucketCapacity: initialMachine?.frontBucketCapacity === undefined ? "" : String(initialMachine.frontBucketCapacity),
    rearBucketCapacity: initialMachine?.rearBucketCapacity === undefined ? "" : String(initialMachine.rearBucketCapacity),
    availability: initialMachine?.availability ?? emptyForm.availability,
    quantity: initialMachine ? String(initialMachine.quantity) : "1",
    category: initialMachine?.category ?? "",
    imageUrl: initialMachine?.image ?? "",
    imageFichaTecnicaUrl: initialMachine?.imagenFichaTecnica ?? "",
  }));
  const [image, setImage] = useState("");
  const [technicalImage, setTechnicalImage] = useState("");
  const [photos, setPhotos] = useState<string[]>(initialMachine?.photos ?? []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [processingPhotos, setProcessingPhotos] = useState(false);

  const readImage = async (event: ChangeEvent<HTMLInputElement>, onRead: (image: string) => void) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      onRead(await compressImage(file));
      setError("");
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : "No se pudo procesar la imagen.");
    }
  };

  const readPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    if (photos.length + files.length > photoLabels.length) {
      setError(`Puedes agregar ${photoLabels.length - photos.length} foto(s) más. El máximo es 6 del equipo y 1 del local.`);
      return;
    }

    setProcessingPhotos(true);
    setError("");
    try {
      const compressedPhotos: string[] = [];
      for (const file of files) {
        compressedPhotos.push(await compressImage(file, 200 * 1024, 1600));
      }
      setPhotos((current) => [...current, ...compressedPhotos]);
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : "No se pudieron procesar las fotos.");
    } finally {
      setProcessingPhotos(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const parsedPrice = Number(form.price);
    const horsepower = Number(form.horsepower);
    const weight = form.weight ? Number(form.weight) : undefined;
    const frontBucketCapacity = form.frontBucketCapacity ? Number(form.frontBucketCapacity) : undefined;
    const rearBucketCapacity = form.rearBucketCapacity ? Number(form.rearBucketCapacity) : undefined;
    const quantity = Number(form.quantity);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0 || !Number.isFinite(horsepower) || horsepower <= 0) {
      setError("Ingresa un precio y una potencia válidos.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError("Ingresa una cantidad disponible válida (entero igual o mayor que cero).");
      return;
    }
    if (weight !== undefined && (!Number.isFinite(weight) || weight < 0)) {
      setError("Ingresa un peso válido.");
      return;
    }
    if ([frontBucketCapacity, rearBucketCapacity].some((capacity) =>
      capacity !== undefined && (!Number.isFinite(capacity) || capacity < 0)
    )) {
      setError("Ingresa una capacidad de cucharón válida.");
      return;
    }

    setSaving(true);
    try {
      const currentImage = form.imageUrl.trim();
      const currentTechnicalImage = form.imageFichaTecnicaUrl.trim();
      const [savedImage, savedTechnicalImage] = await Promise.all([
        image || (currentImage.startsWith("data:image/")
          ? compressImageDataUrl(currentImage)
          : currentImage || "https://images.unsplash.com/photo-1580901368919-7738efb0f87e?auto=format&fit=crop&w=1200&q=85"),
        technicalImage || (currentTechnicalImage.startsWith("data:image/")
          ? compressImageDataUrl(currentTechnicalImage)
          : currentTechnicalImage || undefined),
      ]);
      const machine: Machine = {
        id: initialMachine?.id ?? `maquinaria-${crypto.randomUUID()}`,
        name: form.name.trim(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        price: parsedPrice,
        engine: form.engine.trim(),
        horsepower,
        weight,
        frontBucketCapacity,
        rearBucketCapacity,
        availability: form.availability,
        quantity,
        image: savedImage,
        imagenFichaTecnica: savedTechnicalImage,
        photos,
        category: form.category.trim() || "Maquinaria",
      };
      if (await onSave(machine)) onClose();
      else setError("No se pudo guardar la maquinaria. Revisa la conexión e inténtalo nuevamente.");
    } catch (saveError) {
      console.error("No se pudo guardar la maquinaria.", saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la maquinaria.");
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="machine-form-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-7">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Inventario</p>
            <h2 id="machine-form-title" className="mt-1 text-xl font-bold text-corporate-blue">{initialMachine ? "Editar maquinaria" : "Agregar maquinaria"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar formulario" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">Nombre del equipo<input required name="name" value={form.name} onChange={updateForm} className={inputClass} /></label>
            <label className="text-sm font-semibold text-slate-600">Categoría<input name="category" value={form.category} onChange={updateForm} placeholder="Ej. Retroexcavadoras" className={inputClass} /></label>
            <label className="text-sm font-semibold text-slate-600">Marca<input required name="brand" value={form.brand} onChange={updateForm} className={inputClass} /></label>
            <label className="text-sm font-semibold text-slate-600">Modelo<input required name="model" value={form.model} onChange={updateForm} className={inputClass} /></label>
            <label className="text-sm font-semibold text-slate-600">Precio (USD)<input required min="1" step="0.01" type="number" name="price" value={form.price} onChange={updateForm} className={inputClass} /></label>
            <label className="text-sm font-semibold text-slate-600">Unidades disponibles<input required min="0" step="1" type="number" name="quantity" value={form.quantity} onChange={updateForm} className={inputClass} /></label>
            <label className="text-sm font-semibold text-slate-600">Motor<input required name="engine" value={form.engine} onChange={updateForm} className={inputClass} /></label>
            <label className="text-sm font-semibold text-slate-600">Potencia (HP)<input required min="1" step="0.1" type="number" name="horsepower" value={form.horsepower} onChange={updateForm} className={inputClass} /></label>
            <label className="text-sm font-semibold text-slate-600">Peso operativo (kg)<input min="0" step="1" type="number" name="weight" value={form.weight} onChange={updateForm} className={inputClass} /></label>
            <label className="text-sm font-semibold text-slate-600">Capacidad del cucharón delantero (m³)<input min="0" step="0.001" type="number" name="frontBucketCapacity" value={form.frontBucketCapacity} onChange={updateForm} placeholder="Opcional" className={inputClass} /></label>
            <label className="text-sm font-semibold text-slate-600">Capacidad del cucharón posterior (m³)<input min="0" step="0.001" type="number" name="rearBucketCapacity" value={form.rearBucketCapacity} onChange={updateForm} placeholder="Opcional" className={inputClass} /></label>
            <label className="text-sm font-semibold text-slate-600 sm:col-span-2">Estado
              <select name="availability" value={form.availability} onChange={updateForm} className={inputClass}>
                <option>Disponible</option>
                <option>En Tránsito</option>
                <option>Vendido</option>
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Foto de la maquinaria</p>
            <label className="mt-3 block text-xs font-medium text-slate-500">Subir archivo (máximo 15 MB; se optimiza a 200 KB)
              <input type="file" accept="image/*" onChange={(event) => readImage(event, (value) => { setImage(value); setForm((current) => ({ ...current, imageUrl: "" })); })} className="mt-1.5 block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-corporate-blue" />
            </label>
            <label className="mt-3 block text-xs font-medium text-slate-500">O pegar URL de imagen
              <input type="url" name="imageUrl" value={form.imageUrl} onChange={(event) => { updateForm(event); setImage(""); }} placeholder="https://..." className={inputClass} />
            </label>
            {(image || form.imageUrl) && <img src={image || form.imageUrl} alt="Vista previa del equipo" className="mt-3 h-32 w-full rounded-lg object-cover" />}
            {!image && !form.imageUrl && <p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><ImagePlus size={15} /> Si no agregas una imagen, se utilizará una foto de muestra.</p>}
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Ficha técnica detallada</p>
            <label className="mt-3 block text-xs font-medium text-slate-500">Subir archivo (máximo 15 MB; se optimiza a 200 KB)
              <input type="file" accept="image/*" onChange={(event) => readImage(event, (value) => { setTechnicalImage(value); setForm((current) => ({ ...current, imageFichaTecnicaUrl: "" })); })} className="mt-1.5 block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-corporate-blue" />
            </label>
            <label className="mt-3 block text-xs font-medium text-slate-500">O pegar URL de imagen
              <input type="url" name="imageFichaTecnicaUrl" value={form.imageFichaTecnicaUrl} onChange={(event) => { updateForm(event); setTechnicalImage(""); }} placeholder="https://..." className={inputClass} />
            </label>
            {(technicalImage || form.imageFichaTecnicaUrl) && <img src={technicalImage || form.imageFichaTecnicaUrl} alt="Vista previa de la ficha técnica" className="mt-3 max-h-48 w-full rounded-lg bg-white object-contain" />}
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Fotos para la proforma (hasta 7)</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Puedes seleccionar varias imágenes a la vez o agregarlas en varias tandas. Se ordenan así: frontal, posterior, laterales, interior 1, interior 2 y foto del local al final.
              En Windows, mantén Ctrl para elegir varias fotos en el selector.
            </p>
            <label className="mt-3 block text-xs font-medium text-slate-500">
              Agregar fotos ({photos.length} de 7; máximo 15 MB por archivo)
              <input aria-label="Agregar varias fotos de la maquinaria y del local" type="file" accept="image/*" multiple disabled={processingPhotos || photos.length >= photoLabels.length} onChange={(event) => void readPhotos(event)} className="mt-1.5 block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-corporate-blue disabled:opacity-50" />
            </label>
            {processingPhotos && <p role="status" className="mt-2 text-xs text-slate-500">Comprimiendo las fotos seleccionadas…</p>}
            {photos.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((photo, index) => <div key={`${index}-${photo.slice(0, 30)}`} className="overflow-hidden rounded-lg bg-white">
                <img src={photo} alt={`Vista previa ${photoLabels[index]}`} className="h-24 w-full object-cover" />
                <p className="truncate px-2 py-1 text-[10px] font-medium text-slate-600">{photoLabels[index]}</p>
                <button type="button" aria-label={`Quitar ${photoLabels[index]}`} onClick={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))} className="px-2 pb-2 text-[10px] font-semibold text-red-600 hover:underline">Quitar</button>
              </div>)}
            </div>}
            {photos.length > 0 && <button type="button" onClick={() => setPhotos([])} className="mt-2 text-xs font-semibold text-red-600 hover:underline">Quitar todas las fotos</button>}
          </div>

          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={saving || processingPhotos} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={saving || processingPhotos} className="rounded-xl bg-corporate-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:cursor-wait disabled:opacity-70">{processingPhotos ? "Preparando fotos…" : saving ? "Guardando…" : initialMachine ? "Guardar cambios" : "Guardar maquinaria"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
