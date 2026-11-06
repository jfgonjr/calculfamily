"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Copy, Share2 } from "lucide-react";
import { useFamily } from "@/components/providers/FamilyProvider";
import { Avatar } from "@/components/ui/avatar";
import { computeSettlement } from "@/lib/settlement";
import { formatBRL, monthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const cents = (c: number) => formatBRL(c / 100);

export default function AcertosPage() {
  const { loading, members, transactions, memberById, month } = useFamily();
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const participants = useMemo(
    () => members.filter((m) => !excluded.has(m.id)).map((m) => ({ id: m.id, name: m.full_name })),
    [members, excluded]
  );

  const paidExpenses = useMemo(
    () => transactions.filter((t) => t.type === "expense" && t.status === "paid"),
    [transactions]
  );
  const pendingCount = useMemo(
    () => transactions.filter((t) => t.type === "expense" && t.status === "pending").length,
    [transactions]
  );

  const result = useMemo(
    () => computeSettlement(participants, paidExpenses),
    [participants, paidExpenses]
  );

  // Despesas pagas por quem está fora da divisão não entram no cálculo: avisamos
  const ignoredCents = useMemo(() => {
    const out = paidExpenses
      .filter((t) => excluded.has(t.user_id))
      .reduce((s, t) => s + Math.round(t.amount * 100), 0);
    return out;
  }, [paidExpenses, excluded]);

  function toggle(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const summaryText = useMemo(() => {
    const lines = [`Acerto de ${monthLabel(month)} — Calculadora Familioa`];
    lines.push(`Total pago: ${cents(result.totalCents)}`);
    if (participants.length) lines.push(`Cota de cada um: ${cents(result.balances[0]?.shareCents ?? 0)}`);
    lines.push("");
    if (result.transfers.length === 0) lines.push("Tudo certo, ninguém deve nada.");
    for (const t of result.transfers) {
      lines.push(`${t.fromName} deve ${cents(t.amountCents)} para ${t.toName}`);
    }
    return lines.join("\n");
  }, [result, participants, month]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ text: summaryText });
        return;
      } catch {
        return; // usuário cancelou
      }
    }
    copy();
  }

  if (loading) return <p className="py-10 text-center text-slate-400">Carregando…</p>;

  return (
    <div className="space-y-5">
      {/* Quem divide */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500">Quem divide as despesas</h2>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const on = !excluded.has(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                aria-pressed={on}
                className={cn(
                  "flex h-12 items-center gap-2 rounded-full border-2 pl-1.5 pr-4 font-medium",
                  on ? "text-white" : "border-slate-200 bg-white text-slate-400 line-through"
                )}
                style={on ? { backgroundColor: m.color, borderColor: m.color } : undefined}
              >
                <Avatar name={m.full_name} color={on ? "rgba(255,255,255,0.25)" : "#cbd5e1"} size="sm" />
                {m.full_name}
              </button>
            );
          })}
        </div>
        {ignoredCents > 0 && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {cents(ignoredCents)} em despesas pagas por quem está fora da divisão não entraram na conta.
          </p>
        )}
      </section>

      {/* Resumo */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs text-slate-500">Total pago no mês</p>
          <p className="text-xl font-bold">{cents(result.totalCents)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs text-slate-500">Cota de cada um</p>
          <p className="text-xl font-bold">
            {participants.length ? cents(result.balances[0]?.shareCents ?? 0) : "—"}
          </p>
        </div>
      </section>

      {pendingCount > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {pendingCount} despesa{pendingCount > 1 ? "s" : ""} pendente{pendingCount > 1 ? "s" : ""} não
          {pendingCount > 1 ? " entram" : " entra"} no acerto até serem marcadas como pagas.
        </p>
      )}

      {/* Transferências */}
      <section>
        <h2 className="mb-2 text-lg font-bold">Quem paga quem</h2>
        {participants.length < 2 ? (
          <p className="rounded-2xl bg-white p-5 text-center text-slate-500 ring-1 ring-slate-100">
            Escolha pelo menos 2 pessoas para dividir.
          </p>
        ) : result.transfers.length === 0 ? (
          <div className="rounded-2xl bg-emerald-50 p-5 text-center text-emerald-700">
            <Check className="mx-auto mb-1 h-8 w-8" />
            <p className="font-semibold">
              {result.totalCents === 0 ? "Nenhuma despesa paga neste mês." : "Tudo certo, ninguém deve nada!"}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {result.transfers.map((t, i) => {
              const from = memberById(t.fromId);
              const to = memberById(t.toId);
              return (
                <li key={i} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center gap-1">
                      {from && <Avatar name={from.full_name} color={from.color} size="lg" />}
                      <span className="text-sm font-medium">{t.fromName}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-extrabold text-brand-600">{cents(t.amountCents)}</span>
                      <ArrowRight className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      {to && <Avatar name={to.full_name} color={to.color} size="lg" />}
                      <span className="text-sm font-medium">{t.toName}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-sm text-slate-600">
                    <strong>{t.fromName}</strong> deve <strong>{cents(t.amountCents)}</strong> para{" "}
                    <strong>{t.toName}</strong>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Saldo individual */}
      {participants.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-500">Quanto cada um pagou</h2>
          <ul className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            {result.balances.map((b) => {
              const m = memberById(b.id);
              return (
                <li key={b.id} className="flex items-center gap-3 p-3">
                  {m && <Avatar name={m.full_name} color={m.color} />}
                  <div className="flex-1">
                    <p className="font-semibold">{b.name}</p>
                    <p className="text-xs text-slate-500">Pagou {cents(b.paidCents)}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-sm font-bold",
                      b.balanceCents > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : b.balanceCents < 0
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {b.balanceCents > 0 ? "recebe " : b.balanceCents < 0 ? "paga " : "quite "}
                    {b.balanceCents !== 0 && cents(Math.abs(b.balanceCents))}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Compartilhar */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={copy}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-white font-semibold ring-1 ring-slate-200 active:bg-slate-50"
        >
          {copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5" />}
          {copied ? "Copiado!" : "Copiar"}
        </button>
        <button
          onClick={share}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand-600 font-semibold text-white active:bg-brand-700"
        >
          <Share2 className="h-5 w-5" />
          Compartilhar
        </button>
      </div>
    </div>
  );
}
