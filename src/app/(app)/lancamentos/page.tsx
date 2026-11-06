"use client";

import { useMemo, useState } from "react";
import { Clock, Search } from "lucide-react";
import { useFamily } from "@/components/providers/FamilyProvider";
import { useTransactionEditor } from "@/components/transactions/EditorProvider";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatBRL, formatDateBR } from "@/lib/format";

type TypeFilter = "all" | "expense" | "income";
type StatusFilter = "all" | "paid" | "pending";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-10 shrink-0 rounded-full px-4 text-sm font-medium",
        active ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
      )}
    >
      {children}
    </button>
  );
}

export default function LancamentosPage() {
  const { loading, transactions, members, categories, memberById, categoryById } = useFamily();
  const { openEdit } = useTransactionEditor();

  const [type, setType] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [memberId, setMemberId] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter(
      (t) =>
        (type === "all" || t.type === type) &&
        (status === "all" || t.status === status) &&
        (memberId === "all" || t.user_id === memberId) &&
        (categoryId === "all" || t.category_id === categoryId) &&
        (!q || t.title.toLowerCase().includes(q))
    );
  }, [transactions, type, status, memberId, categoryId, query]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense };
  }, [filtered]);

  // Agrupa por data
  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="flex h-12 items-center gap-2 rounded-2xl bg-white px-4 ring-1 ring-slate-200">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar lançamento"
          className="h-full w-full bg-transparent outline-none"
        />
      </div>

      {/* Filtros rápidos */}
      <div className="-mx-4 space-y-2 px-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={type === "all"} onClick={() => setType("all")}>Tudo</Chip>
          <Chip active={type === "expense"} onClick={() => setType("expense")}>Despesas</Chip>
          <Chip active={type === "income"} onClick={() => setType("income")}>Receitas</Chip>
          <span className="mx-1 w-px shrink-0 bg-slate-200" />
          <Chip active={status === "all"} onClick={() => setStatus("all")}>Todos status</Chip>
          <Chip active={status === "paid"} onClick={() => setStatus("paid")}>Pagos</Chip>
          <Chip active={status === "pending"} onClick={() => setStatus("pending")}>Pendentes</Chip>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={memberId === "all"} onClick={() => setMemberId("all")}>Todos</Chip>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setMemberId(memberId === m.id ? "all" : m.id)}
              className={cn(
                "h-10 shrink-0 rounded-full px-4 text-sm font-medium",
                memberId === m.id ? "text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
              )}
              style={memberId === m.id ? { backgroundColor: m.color } : undefined}
            >
              {m.full_name}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={categoryId === "all"} onClick={() => setCategoryId("all")}>Categorias</Chip>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(categoryId === c.id ? "all" : c.id)}
              className={cn(
                "h-10 shrink-0 rounded-full px-4 text-sm font-medium",
                categoryId === c.id ? "text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
              )}
              style={categoryId === c.id ? { backgroundColor: c.color } : undefined}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Totais do filtro */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-emerald-50 p-3">
          <p className="text-xs text-emerald-700">Receitas</p>
          <p className="font-bold text-emerald-700">{formatBRL(totals.income)}</p>
        </div>
        <div className="rounded-2xl bg-rose-50 p-3">
          <p className="text-xs text-rose-700">Despesas</p>
          <p className="font-bold text-rose-700">{formatBRL(totals.expense)}</p>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="py-10 text-center text-slate-400">Carregando…</p>
      ) : groups.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <p className="font-medium">Nenhum lançamento por aqui</p>
          <p className="text-sm">Toque no + para registrar o primeiro.</p>
        </div>
      ) : (
        groups.map(([date, items]) => (
          <section key={date}>
            <h3 className="mb-2 text-sm font-semibold text-slate-500">{formatDateBR(date)}</h3>
            <ul className="space-y-2">
              {items.map((t) => {
                const m = memberById(t.user_id);
                const c = categoryById(t.category_id);
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => openEdit(t)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-100 active:bg-slate-50"
                    >
                      {m && <Avatar name={m.full_name} color={m.color} />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{t.title}</p>
                        <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                          {c && (
                            <span className="inline-flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                              {c.name}
                            </span>
                          )}
                          {m && <span>· {m.full_name}</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-bold", t.type === "income" ? "text-emerald-600" : "text-rose-600")}>
                          {t.type === "income" ? "+" : "−"} {formatBRL(t.amount)}
                        </p>
                        {t.status === "pending" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            <Clock className="h-3 w-3" /> Pendente
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
