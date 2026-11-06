"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, LayoutDashboard, Receipt, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/lancamentos", label: "Lançamentos", icon: Receipt },
  { href: "/acertos", label: "Acertos", icon: Calculator },
  { href: "/perfil", label: "Família", icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                  active ? "text-brand-600" : "text-slate-500"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-7 w-7" strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
