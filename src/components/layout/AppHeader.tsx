"use client";

import { MonthPicker } from "./MonthPicker";
import { useFamily } from "@/components/providers/FamilyProvider";
import { Avatar } from "@/components/ui/avatar";

export function AppHeader() {
  const { me, family, error, loading } = useFamily();

  return (
    <header
      className="sticky top-0 z-20 bg-slate-50/95 px-4 pb-3 backdrop-blur"
      style={{ paddingTop: "calc(0.75rem + var(--safe-top))" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Calculadora</p>
          <h1 className="text-xl font-bold leading-tight">{family?.name ?? "Familioa"}</h1>
        </div>
        {me && <Avatar name={me.full_name} color={me.color} />}
      </div>
      <MonthPicker />
      {!loading && error && (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</p>
      )}
    </header>
  );
}
