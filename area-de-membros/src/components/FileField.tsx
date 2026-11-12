/* Campo de envio de arquivo com prévia do atual e opção de remover. Lido no servidor por fileField(). */
export function FileField({ name, label, current, kind = "image", hint, aspect = "aspect-video" }: {
  name: string; label: string; current?: string | null; kind?: "image" | "pdf" | "doc"; hint?: string; aspect?: string;
}) {
  const accept = kind === "image" ? "image/png,image/jpeg,image/webp,image/gif" : kind === "pdf" ? "application/pdf,.pdf" : ".pdf,.docx,.xlsx,.pptx";
  return (
    <div>
      <label className="label" htmlFor={`f-${name}`}>{label}</label>
      {current && (
        <div className="mb-2 flex items-center gap-3">
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt="" className={`h-16 ${aspect} rounded-lg border border-slate-200 bg-white object-contain`} />
          ) : (
            <a href={current} target="_blank" rel="noreferrer" className="link text-sm">📄 Abrir arquivo atual</a>
          )}
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" name={`${name}__remove`} />Remover
          </label>
          <input type="hidden" name={`${name}__current`} value={current} />
        </div>
      )}
      <input id={`f-${name}`} className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700" type="file" name={name} accept={accept} />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
