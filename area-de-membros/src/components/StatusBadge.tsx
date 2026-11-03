export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    processed: "bg-emerald-100 text-emerald-800",
    ignored: "bg-slate-100 text-slate-700",
    error: "bg-red-100 text-red-800",
    received: "bg-amber-100 text-amber-800",
  };
  return <span className={`badge ${map[status] ?? "bg-slate-100"}`}>{status}</span>;
}
