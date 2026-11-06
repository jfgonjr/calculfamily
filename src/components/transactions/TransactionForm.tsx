"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useFamily } from "@/components/providers/FamilyProvider";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { defaultDateFor, parseBRL } from "@/lib/format";
import type { Transaction, TransactionStatus, TransactionType } from "@/types";

interface Props {
  editing: Transaction | null; // null = novo
  onClose: () => void;
}

export function TransactionForm({ editing, onClose }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { me, family, members, categories, month, reload } = useFamily();

  const [type, setType] = useState<TransactionType>(editing?.type ?? "expense");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [amountText, setAmountText] = useState(
    editing ? editing.amount.toFixed(2).replace(".", ",") : ""
  );
  const [categoryId, setCategoryId] = useState<string | null>(editing?.category_id ?? null);
  const [date, setDate] = useState(editing?.date ?? defaultDateFor(month));
  const [status, setStatus] = useState<TransactionStatus>(editing?.status ?? "paid");
  const [userId, setUserId] = useState<string>(editing?.user_id ?? me?.id ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeCategories = categories.filter((c) => c.type === type);

  // Se trocar entre despesa/receita, a categoria escolhida pode não servir mais
  useEffect(() => {
    if (categoryId && !typeCategories.some((c) => c.id === categoryId)) setCategoryId(null);
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trava o scroll do fundo enquanto o formulário está aberto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amount = parseBRL(amountText);
    if (!title.trim()) return setError("Informe um título.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Informe um valor maior que zero.");
    if (!userId) return setError("Escolha quem pagou.");
    if (!family) return setError("Família não carregada. Tente novamente.");

    setSaving(true);
    const payload = {
      family_id: family.id,
      user_id: userId,
      category_id: categoryId,
      title: title.trim(),
      amount,
      type,
      date,
      status,
      notes: notes.trim() || null,
    };

    const { error } = editing
      ? await supabase.from("transactions").update(payload).eq("id", editing.id)
      : await supabase.from("transactions").insert(payload);

    setSaving(false);
    if (error) {
      setError("Não foi possível salvar. Verifique a conexão e tente de novo.");
      return;
    }
    await reload();
    onClose();
  }

  async function remove() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from("transactions").delete().eq("id", editing.id);
    setSaving(false);
    if (error) {
      setError("Não foi possível excluir. Tente de novo.");
      return;
    }
    await reload();
    onClose();
  }

  const isExpense = type === "expense";

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto flex max-h-[94dvh] w-full max-w-md flex-col rounded-t-3xl bg-white"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-lg font-bold">{editing ? "Editar lançamento" : "Novo lançamento"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full active:bg-slate-100"
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 pb-4">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
            {(["expense", "income"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "h-12 rounded-xl font-semibold",
                  type === t
                    ? t === "expense"
                      ? "bg-rose-500 text-white"
                      : "bg-emerald-500 text-white"
                    : "text-slate-600"
                )}
              >
                {t === "expense" ? "Despesa" : "Receita"}
              </button>
            ))}
          </div>

          {/* Valor */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Valor</label>
            <div className="flex items-center rounded-2xl border border-slate-200 px-4 focus-within:border-brand-500">
              <span className="text-xl font-semibold text-slate-400">R$</span>
              <input
                inputMode="decimal"
                autoFocus={!editing}
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                placeholder="0,00"
                className="h-16 w-full bg-transparent px-3 text-3xl font-bold outline-none"
              />
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isExpense ? "Ex.: Mercado, Conta de luz" : "Ex.: Salário"}
              maxLength={80}
              className="h-14 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-brand-500"
            />
          </div>

          {/* Quem pagou / recebeu */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              {isExpense ? "Quem pagou" : "Quem recebeu"}
            </label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const active = userId === m.id;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setUserId(m.id)}
                    className={cn(
                      "flex h-12 items-center gap-2 rounded-full border-2 pl-1.5 pr-4 font-medium",
                      active ? "text-white" : "border-slate-200 bg-white text-slate-700"
                    )}
                    style={active ? { backgroundColor: m.color, borderColor: m.color } : undefined}
                  >
                    <Avatar name={m.full_name} color={active ? "rgba(255,255,255,0.25)" : m.color} size="sm" />
                    {m.full_name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {typeCategories.map((c) => {
                const active = categoryId === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCategoryId(active ? null : c.id)}
                    className={cn(
                      "h-11 rounded-full border-2 px-4 text-sm font-medium",
                      active ? "text-white" : "border-slate-200 bg-white text-slate-700"
                    )}
                    style={active ? { backgroundColor: c.color, borderColor: c.color } : undefined}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data e status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-14 w-full rounded-2xl border border-slate-200 px-3 outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Status</label>
              <div className="grid h-14 grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
                {(["paid", "pending"] as const).map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      "rounded-xl text-sm font-semibold",
                      status === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    )}
                  >
                    {s === "paid" ? "Pago" : "Pendente"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={300}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500"
            />
          </div>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </div>

        {/* Ações */}
        <div
          className="flex gap-3 border-t border-slate-100 px-5 pt-3"
          style={{ paddingBottom: "calc(0.75rem + var(--safe-bottom))" }}
        >
          {editing &&
            (confirmDelete ? (
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="h-14 shrink-0 rounded-2xl bg-red-600 px-4 font-semibold text-white active:bg-red-700"
              >
                Confirmar exclusão
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-red-200 text-red-600 active:bg-red-50"
                aria-label="Excluir"
              >
                <Trash2 className="h-6 w-6" />
              </button>
            ))}
          <button
            type="submit"
            disabled={saving}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-600 text-lg font-semibold text-white active:bg-brand-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
