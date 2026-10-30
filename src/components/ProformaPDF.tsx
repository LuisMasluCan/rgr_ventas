import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { formatCurrency } from "../mockData";
import type { Client, Machine } from "../types";

interface ProformaPDFProps {
  machine: Machine;
  clients: Client[];
  initialClientId: string;
  quotationNumber: string;
  initialDescription: string;
  onBack: () => void;
  onSaveQuotation: (client: Client, description: string) => Promise<boolean>;
}

export default function ProformaPDF({
  machine,
  clients,
  initialClientId,
  quotationNumber,
  initialDescription,
  onBack,
  onSaveQuotation,
}: ProformaPDFProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState(initialClientId);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState("");
  const client = clients.find((item) => item.id === clientId);

  const printDocument = useReactToPrint({
    contentRef: documentRef,
    documentTitle: `Proforma-${quotationNumber}`,
    pageStyle: "@page { size: A4; margin: 0; } @media print { html, body { width: 210mm; margin: 0 !important; padding: 0 !important; } }",
    onPrintError: (_location, printError) => {
      console.error("No se pudo imprimir la proforma.", printError);
      setError("No se pudo abrir la ventana de impresión. Revisa los permisos del navegador e inténtalo nuevamente.");
    },
  });

  const handlePrint = async () => {
    setError("");
    if (!client) {
      setError("Agrega un cliente antes de generar la proforma.");
      return;
    }
    try {
      if (!await onSaveQuotation(client, description)) {
        setError("No se pudo guardar la cotización. Revisa la conexión con el servidor e inténtalo nuevamente.");
        return;
      }
    } catch (saveError) {
      console.error("No se pudo guardar la cotización.", saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la cotización.");
      return;
    }
    printDocument();
  };

  const today = new Date().toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-500">Ventas / Proformas</p>
          <h1 className="text-2xl font-bold tracking-tight text-corporate-blue sm:text-3xl">Generador de proforma</h1>
          <p className="mt-2 text-sm text-slate-500">Previsualiza el documento y guárdalo como PDF desde la impresión del navegador.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            <ArrowLeft size={16} /> Volver
          </button>
          <button type="button" onClick={handlePrint} disabled={!client} className="inline-flex items-center gap-2 rounded-xl bg-corporate-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60">
            <Download size={16} /> Descargar Proforma PDF
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-soft print:hidden">
        <label htmlFor="client" className="text-sm font-semibold text-slate-600">Cliente de la proforma</label>
        {clients.length > 0
          ? <select id="client" value={clientId} onChange={(event) => setClientId(event.target.value)} className="min-w-60 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100">
            {clients.map((item) => <option key={item.id} value={item.id}>{item.company} — {item.name}</option>)}
          </select>
          : <p className="text-sm text-amber-700">Registra un cliente para generar esta cotización.</p>}
        <span className="text-sm text-slate-400">{machine.name} · {formatCurrency(machine.price)}</span>
      </div>

      <label className="mb-5 block rounded-xl border border-slate-100 bg-white p-4 shadow-soft print:hidden">
        <span className="block text-sm font-semibold text-slate-600">Descripción de la oferta</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={1500}
          rows={3}
          placeholder="Escribe aquí una descripción para esta cotización (opcional)."
          className="mt-2 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
        />
        <span className="mt-1 block text-xs text-slate-400">Se guarda al descargar la proforma. {description.length}/1500</span>
      </label>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 print:hidden">{error}</p>}

      <div className="overflow-x-auto rounded-2xl bg-slate-200/70 p-4 sm:p-8 print:overflow-visible print:rounded-none print:bg-white print:p-0">
        <div ref={documentRef} className={`proforma-document mx-auto w-full max-w-[794px] text-slate-800 print:w-[210mm] print:max-w-none${machine.photos?.length ? " proforma-with-gallery" : ""}`} style={{ fontFamily: "Arial, sans-serif" }}>
          <div className="proforma-page relative min-h-[1123px] bg-white px-10 py-12 shadow-md sm:px-16 sm:py-14 print:box-border print:min-h-[297mm] print:w-[210mm] print:px-[16mm] print:py-[10mm] print:shadow-none">
          <div className="flex items-start justify-between gap-4 border-b-2 border-corporate-blue pb-6 print:pb-3">
            <div>
              <img src="/logo-rgr.png" alt="RGR Vehículos y Maquinarias" className="h-auto w-[215px] object-contain print:w-[180px]" />
              <p className="mt-4 text-xs leading-5 text-slate-500 print:mt-2 print:leading-4">Equipos para el desarrollo de la Amazonía<br />Pucallpa, Ucayali — Perú</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-corporate-green">Documento comercial</p>
              <h2 className="mt-2 text-xl font-bold text-corporate-blue">{quotationNumber}</h2>
              <p className="mt-2 text-xs text-slate-500">Pucallpa, {today}</p>
            </div>
          </div>

          <div className="mt-9 grid grid-cols-2 gap-6 rounded-xl bg-slate-50 p-5 print:mt-5 print:gap-4 print:bg-slate-50 print:p-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Datos del cliente</p>
              <p className="mt-3 text-sm font-bold text-slate-800 print:mt-1">Señores: {client?.company ?? "Seleccione un cliente"} - RUC/DNI: {client?.documento ?? "No registrado"}</p>
              <p className="mt-1 text-xs text-slate-600">Atención: {client?.name ?? "—"}</p>
              <p className="mt-1 text-xs text-slate-600">Teléfono: {client?.phone ?? "—"}</p>
            </div>
            <div className="border-l border-slate-200 pl-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Emitido por</p>
              <p className="mt-3 text-sm font-bold text-slate-800">RGR Selva Equipos y Maquinarias</p>
              <p className="mt-1 text-xs text-slate-600">RUC: 20600270002</p>
              <p className="mt-1 text-xs text-slate-600">Moneda: Dólares americanos (USD)</p>
              <p className="mt-1 text-xs text-slate-600">Vendedor: Área comercial</p>
            </div>
          </div>

          <div className="mt-9 print:mt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-corporate-blue print:mb-2">Detalle de la oferta</p>
            <div className="grid grid-cols-[0.85fr_1.15fr] gap-4 print:gap-3">
              <div className="h-56 overflow-hidden rounded-xl bg-white print:h-[38mm]">
                <img src={machine.image} alt={machine.name} className="h-full w-full object-cover" />
              </div>
              <table className="h-fit w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-corporate-blue text-white">
                    <th className="rounded-l-lg px-3 py-3 font-semibold print:px-2 print:py-2">Especificación</th>
                    <th className="rounded-r-lg px-3 py-3 font-semibold print:px-2 print:py-2">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="px-3 py-3 font-semibold text-slate-600 print:px-2 print:py-2">Máquina</td>
                    <td className="px-3 py-3 font-bold text-slate-800 print:px-2 print:py-2">{machine.name}</td>
                  </tr>
                  <tr className="border-b border-slate-200"><td className="px-3 py-3 font-semibold text-slate-600 print:px-2 print:py-2">Marca / Modelo</td><td className="px-3 py-3 text-slate-700 print:px-2 print:py-2">{machine.brand} / {machine.model}</td></tr>
                  <tr className="border-b border-slate-200"><td className="px-3 py-3 font-semibold text-slate-600 print:px-2 print:py-2">Motor</td><td className="px-3 py-3 text-slate-700 print:px-2 print:py-2">{machine.engine}</td></tr>
                  <tr className="border-b border-slate-200"><td className="px-3 py-3 font-semibold text-slate-600 print:px-2 print:py-2">Potencia</td><td className="px-3 py-3 text-slate-700 print:px-2 print:py-2">{machine.horsepower} HP</td></tr>
                  <tr className={machine.frontBucketCapacity !== undefined || machine.rearBucketCapacity !== undefined ? "border-b border-slate-200" : ""}><td className="px-3 py-3 font-semibold text-slate-600 print:px-2 print:py-2">Peso operativo</td><td className="px-3 py-3 text-slate-700 print:px-2 print:py-2">{machine.weight !== undefined ? `${machine.weight.toLocaleString("es-PE")} kg` : "Consultar"}</td></tr>
                  {machine.frontBucketCapacity !== undefined && <tr className={machine.rearBucketCapacity !== undefined ? "border-b border-slate-200" : ""}><td className="px-3 py-3 font-semibold text-slate-600 print:px-2 print:py-2">Capacidad del cucharón delantero</td><td className="px-3 py-3 text-slate-700 print:px-2 print:py-2">{machine.frontBucketCapacity.toLocaleString("es-PE")} m³</td></tr>}
                  {machine.rearBucketCapacity !== undefined && <tr><td className="px-3 py-3 font-semibold text-slate-600 print:px-2 print:py-2">Capacidad del cucharón posterior</td><td className="px-3 py-3 text-slate-700 print:px-2 print:py-2">{machine.rearBucketCapacity.toLocaleString("es-PE")} m³</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-blue-50 px-5 py-4 print:mt-3 print:px-4 print:py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-corporate-blue">Precio total de la oferta</p>
              <p className="text-xl font-bold text-corporate-blue">{formatCurrency(machine.price)}</p>
            </div>
          </div>

          {description.trim() && <div className="mt-6 rounded-xl border border-green-100 bg-green-50/60 p-5 print:mt-4 print:bg-green-50 print:p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-corporate-green">Descripción</p>
            <p className="whitespace-pre-line break-words text-xs leading-5 text-slate-600 print:leading-4">{description.trim()}</p>
          </div>}

          <p className="mt-8 text-xs leading-5 text-slate-500 print:mt-4 print:leading-4">Agradecemos su preferencia. Quedamos atentos a cualquier consulta sobre esta propuesta comercial.</p>

          <div className="proforma-footer mt-12 border-t border-slate-200 pt-4 text-center print:absolute print:bottom-[6mm] print:left-[16mm] print:right-[16mm] print:mt-0 print:pt-2">
            <p className="text-[9px] font-medium tracking-wide text-slate-500">RGR SELVA · RUC 20600270002 · AV. CENTENARIO 797 · CEL. 949 200 900</p>
          </div>
          </div>
          <div className="technical-page relative flex h-[1123px] w-full flex-col bg-white shadow-md print:box-border print:h-[297mm] print:w-[210mm] print:shadow-none">
            <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-slate-200 px-8 print:h-[12mm] print:px-0">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-corporate-blue">Ficha técnica</p>
                <p className="mt-1 text-xs text-slate-500">{machine.name} · {machine.brand} {machine.model}</p>
              </div>
              <img src="/logo-rgr.png" alt="RGR Selva" className="h-auto w-28 object-contain print:w-24" />
            </div>
            {machine.imagenFichaTecnica
              ? <img src={machine.imagenFichaTecnica} alt={`Ficha técnica detallada de ${machine.name}`} className="technical-sheet h-[980px] w-full object-contain print:h-[250mm] print:max-h-[250mm]" />
              : <p className="flex flex-1 items-center justify-center px-8 text-center text-sm text-slate-400 print:text-slate-500">No se ha cargado una ficha técnica para {machine.name}.</p>}
            <div className="proforma-footer absolute bottom-4 left-6 right-6 border-t border-slate-200 pt-2 text-center print:bottom-[6mm] print:left-[12mm] print:right-[12mm] print:pt-2">
              <p className="text-[9px] font-medium tracking-wide text-slate-500">RGR SELVA · RUC 20600270002 · AV. CENTENARIO 797 · CEL. 949 200 900</p>
            </div>
          </div>
          {machine.photos && machine.photos.length > 0 && <div className="gallery-page relative flex h-[1123px] w-full flex-col bg-white p-8 shadow-md print:box-border print:h-[297mm] print:w-[210mm] print:px-[12mm] print:py-[8mm] print:shadow-none">
            <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-slate-200 pb-3 print:h-[12mm]">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-corporate-blue">Galería de la maquinaria</p>
                <p className="mt-1 text-xs text-slate-500">{machine.name} · {machine.brand} {machine.model}</p>
              </div>
              <img src="/logo-rgr.png" alt="RGR Selva" className="h-auto w-28 object-contain print:w-24" />
            </div>
            <div className="gallery-content flex min-h-0 flex-1 flex-col gap-3 pt-4 print:gap-[3mm] print:pt-[3mm]">
              {machine.photos[6] && <figure className="gallery-store flex h-[270px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 print:h-[65mm] print:rounded-md">
                <img src={machine.photos[6]} alt="Foto del local de RGR Selva" className="h-0 min-h-0 w-full flex-1 object-cover" />
                <figcaption className="shrink-0 border-t border-slate-200 bg-white px-3 py-1.5 text-center text-xs font-semibold text-slate-600 print:py-1">Nuestro local</figcaption>
              </figure>}
              <div className={`gallery-detail-grid grid min-h-0 flex-1 grid-cols-2 gap-3 print:gap-[3mm]${machine.photos[6] ? " has-store-photo" : ""}`}>
                {machine.photos.slice(0, 6).map((photo, index) => (
                  <figure key={`${index}-${photo.slice(0, 30)}`} className="detail-photo flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50 print:rounded-md">
                    <img src={photo} alt={`${machine.name}: ${["Frontal", "Posterior", "Lateral izquierda", "Lateral derecha", "Interior 1", "Interior 2"][index]}`} className="h-0 min-h-0 w-full flex-1 object-cover" />
                    <figcaption className="shrink-0 border-t border-slate-200 bg-white px-3 py-1.5 text-center text-[10px] font-semibold text-slate-600 print:py-1">
                      {["Vista frontal", "Vista posterior", "Lateral izquierda", "Lateral derecha", "Interior 1", "Interior 2"][index]}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
            <div className="proforma-footer absolute bottom-4 left-6 right-6 border-t border-slate-200 pt-2 text-center print:bottom-[6mm] print:left-[12mm] print:right-[12mm] print:pt-2">
              <p className="text-[9px] font-medium tracking-wide text-slate-500">RGR SELVA · RUC 20600270002 · AV. CENTENARIO 797 · CEL. 949 200 900</p>
            </div>
          </div>}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400 print:hidden"><FileText size={14} /> Se abrirá la impresión del navegador; selecciona «Guardar como PDF».</div>
    </section>
  );
}
