"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFamily } from "@/components/providers/FamilyProvider";
import { monthLabel, shiftMonth } from "@/lib/format";

export function MonthPicker() {
  const { month, setMonth } = useFamily();

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-2 py-1 shadow-sm ring-1 ring-slate-200">
      <button
        onClick={() => setMonth(shiftMonth(month, -1))}
        className="flex h-12 w-12 items-center justify-center rounded-xl active:bg-slate-100"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <span className="text-lg font-semibold">{monthLabel(month)}</span>
      <button
        onClick={() => setMonth(shiftMonth(month, 1))}
        className="flex h-12 w-12 items-center justify-center rounded-xl active:bg-slate-100"
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}
