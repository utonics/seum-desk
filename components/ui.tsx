import type { ReactNode } from "react";

export function Card({ title, children, className = "" }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-neutral-200 bg-white p-4 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-neutral-600 mb-2">{title}</h2>}
      {children}
    </section>
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
  disabled,
  type = "button",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
}) {
  const cls =
    variant === "primary"
      ? "bg-neutral-900 text-white hover:bg-neutral-700 disabled:bg-neutral-400"
      : variant === "ghost"
        ? "text-neutral-700 hover:bg-neutral-100"
        : "border border-neutral-300 bg-white hover:bg-neutral-50 disabled:text-neutral-400";
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={`px-3 py-1.5 rounded text-sm ${cls}`}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "pass" | "fail" | "warn" }) {
  const cls =
    tone === "pass"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "fail"
        ? "bg-red-50 text-red-700 border-red-200"
        : tone === "warn"
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-neutral-100 text-neutral-700 border-neutral-200";
  return <span className={`inline-block px-2 py-0.5 rounded border text-xs font-mono ${cls}`}>{children}</span>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-neutral-500 mt-1">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-sm text-neutral-500 py-8 text-center">{children}</div>;
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="rounded border border-red-200 bg-red-50 text-red-800 text-sm px-3 py-2 whitespace-pre-wrap">{message}</div>;
}
