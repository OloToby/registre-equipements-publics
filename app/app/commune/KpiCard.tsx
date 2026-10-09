interface Props {
  label: string;
  value: string;
  target: string;
  ok: boolean | null;
  highlight?: boolean;
}

export default function KpiCard({ label, value, target, ok, highlight }: Props) {
  if (highlight) {
    return (
      <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: "var(--navy)", border: "1px solid var(--navy)" }}>
        <span className="text-xs font-semibold opacity-75 text-white leading-tight">{label}</span>
        <span className="text-3xl font-black text-white leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {target && <span className="text-xs font-semibold" style={{ color: "var(--gold)" }}>{target}</span>}
      </div>
    );
  }

  const bg =
    ok === true  ? "var(--ok-bg)"  :
    ok === false ? "var(--bad-bg)" :
    "var(--surface)";
  const border =
    ok === true  ? "#A3D9BC" :
    ok === false ? "#EBADA8" :
    "var(--line)";
  const valueColor =
    ok === true  ? "var(--ok)"  :
    ok === false ? "var(--bad)" :
    "var(--ink)";
  const subColor =
    ok === true  ? "var(--ok)"  :
    ok === false ? "var(--bad)" :
    "var(--muted)";

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: bg, border: `1px solid ${border}` }}>
      <span className="text-xs font-semibold leading-tight" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-2xl font-black leading-none" style={{ color: valueColor, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      {target && (
        <span className="text-xs font-semibold" style={{ color: subColor }}>
          {ok === true ? "✓ " : ok === false ? "✗ " : ""}Cible {target}
        </span>
      )}
    </div>
  );
}
