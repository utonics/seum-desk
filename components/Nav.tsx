"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "홈" },
  { href: "/regress", label: "회귀" },
  { href: "/regmap", label: "레지스터" },
  { href: "/timing", label: "타이밍" },
  { href: "/spec", label: "명세" },
  { href: "/weekly", label: "주간보고" },
] as const;

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-1">
        <span className="font-semibold mr-4">세움 데스크</span>
        {items.map((it) => {
          const active =
            it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`px-3 py-1.5 rounded text-sm ${
                active
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
