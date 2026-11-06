"use client";

import { useMemo } from "react";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFamily } from "@/components/providers/FamilyProvider";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";

export default function DashboardPage() {
  const { loading, transactions, members, family, categoryById } = useFamily();

  const data = useMemo(() => {
    let income = 0;
    let expense = 0;
    const byMember = new Map<string, number>(members.map((m) => [m.id, 0]));
    const byCategory = new Map<string, number>();

    for (const t of transactions) {
      if (t.type === "income") {
        income += t.amount;
        continue;
      }
      expense += t.amount;
      byMember.set(t.user_id, (byMember.get(t.user_id) ?? 0) + t.amount);
      const key = t.category_id ?? "none";
      byCategory.set(key, (byCategory.get(key) ?? 0) + t.amount);
    }

    const memberRanking = members
      .map((m) => ({ id: m.id, name: m.full_name, color: m.color, value: byMember.get(m.id) ?? 0 }))
      .sort((a, b) => b.value - a.value);

    const categoryData = [...byCategory.entries()]
      .map(([id, value]) => {
        const c = categoryById(id === "none" ? null : id);
        return { name: c?.name ?? "Sem categoria", color: c?.color ?? "#94a3b8", value };
      })
      .sort((a, b) => b.value - a.value);

    return { income, expense, balance: income - expense, memberRanking, categoryData };
  }, [transactions, members, categoryById]);

  const budget = family?.monthly_budget ?? 0;
  const pct = budget > 0 ? (data.expense / budget) * 100 : 0;
  const barColor = pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
  const maxMember = Math.max(...data.memberRanking.map((m) => m.value), 1);

  if (loading) return <p className="py-10 text-center text-slate-400">Carregando…</p>;

  return (
    <div className="space-y-5">
      {/* Saldo */}
      <section
        className={cn(
          "rounded-3xl p-5 text-white shadow-lg",
          data.balance >= 0 ? "bg-gradient-to-br from-brand-600 to-brand-500" : "bg-gradient-to-br from-rose-600 to-rose-500"
        )}
      >
        <p className="flex items-center gap-2 text-sm text-white/80">
          <Wallet className="h-4 w-4" /> Saldo geral do mês
        </p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight">{formatBRL(data.balance)}</p>
      </section>

      {/* Receita e despesa */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <ArrowUpCircle className="h-4 w-4" /> Receitas
          </p>
          <p className="mt-1 text-lg font-bold">{formatBRL(data.income)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
            <ArrowDownCircle className="h-4 w-4" /> Despesas
          </p>
          <p className="mt-1 text-lg font-bold">{formatBRL(data.expense)}</p>
        </div>
      </section>

      {/* Orçamento */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-bold">Orçamento do mês</h2>
          <span className="text-sm text-slate-500">
            {budget > 0 ? `${Math.round(pct)}% usado` : "sem limite"}
          </span>
        </div>
        {budget > 0 ? (
          <>
            <div className="h-4 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.min(Math.round(pct), 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {formatBRL(data.expense)} de {formatBRL(budget)}
            </p>
            {pct >= 100 ? (
              <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                Limite estourado em {formatBRL(data.expense - budget)}.
              </p>
            ) : pct >= 80 ? (
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                Atenção: restam {formatBRL(budget - data.expense)} do limite.
              </p>
            ) : (
              <p className="mt-2 text-sm text-emerald-700">Dentro do limite: restam {formatBRL(budget - data.expense)}.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">Defina o limite na aba Família para acompanhar o orçamento.</p>
        )}
      </section>

      {/* Gastos por membro */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-3 font-bold">Gastos por membro</h2>
        {data.expense === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Sem despesas neste mês.</p>
        ) : (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.memberRanking} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} interval={0} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v: number) => formatBRL(v)}
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,.12)" }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {data.memberRanking.map((m) => (
                      <Cell key={m.id} fill={m.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ol className="mt-3 space-y-3">
              {data.memberRanking.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3">
                  <span className="w-5 text-center text-sm font-bold text-slate-400">{i + 1}º</span>
                  <Avatar name={m.name} color={m.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{m.name}</span>
                      <span className="font-semibold">{formatBRL(m.value)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${(m.value / maxMember) * 100}%`, backgroundColor: m.color }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      {/* Gastos por categoria */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-3 font-bold">Gastos por categoria</h2>
        {data.categoryData.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Sem despesas neste mês.</p>
        ) : (
          <>
            <div className="relative h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {data.categoryData.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatBRL(v)}
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,.12)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-slate-500">Total</span>
                <span className="text-base font-bold">{formatBRL(data.expense)}</span>
              </div>
            </div>
            <ul className="mt-2 space-y-2">
              {data.categoryData.map((c) => (
                <li key={c.name} className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="flex-1">{c.name}</span>
                  <span className="text-slate-500">{Math.round((c.value / data.expense) * 100)}%</span>
                  <span className="w-24 text-right font-semibold">{formatBRL(c.value)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
