"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useFamily } from "@/components/providers/FamilyProvider";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatBRL, parseBRL } from "@/lib/format";

const COLORS = ["#ec4899", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316"];

export default function PerfilPage() {
  const supabase = useMemo(() => createClient(), []);
  const { me, family, members, reloadBase, loading } = useFamily();

  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [budgetText, setBudgetText] = useState("");
  const [saving, setSaving] = useState<"profile" | "budget" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (me) {
      setName(me.full_name);
      setColor(me.color);
    }
  }, [me]);
  useEffect(() => {
    if (family) setBudgetText(family.monthly_budget ? family.monthly_budget.toFixed(2).replace(".", ",") : "");
  }, [family]);

  async function saveProfile() {
    if (!me || !name.trim()) return;
    setSaving("profile");
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim(), color })
      .eq("id", me.id);
    setSaving(null);
    if (error) return setMsg("Não foi possível salvar o perfil.");
    await reloadBase();
    setMsg("Perfil atualizado!");
  }

  async function saveBudget() {
    if (!family) return;
    const value = budgetText.trim() === "" ? 0 : parseBRL(budgetText);
    if (!Number.isFinite(value) || value < 0) return setMsg("Valor de orçamento inválido.");
    setSaving("budget");
    const { error } = await supabase.from("families").update({ monthly_budget: value }).eq("id", family.id);
    setSaving(null);
    if (error) return setMsg("Só administradores podem alterar o orçamento.");
    await reloadBase();
    setMsg("Orçamento atualizado!");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading || !me) return <p className="py-10 text-center text-slate-400">Carregando…</p>;

  const isAdmin = me.role === "admin";

  return (
    <div className="space-y-6">
      {msg && (
        <p
          className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-white"
          role="status"
          onClick={() => setMsg(null)}
        >
          {msg}
        </p>
      )}

      {/* Meu perfil */}
      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <Avatar name={name || me.full_name} color={color} size="lg" />
          <div>
            <h2 className="text-lg font-bold">Meu perfil</h2>
            <p className="text-xs text-slate-500">{isAdmin ? "Administrador(a)" : "Membro"}</p>
          </div>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          className="h-14 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-brand-500"
        />
        <div>
          <p className="mb-2 text-sm font-medium text-slate-600">Minha cor</p>
          <div className="flex flex-wrap gap-3">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Cor ${c}`}
                className={cn(
                  "h-11 w-11 rounded-full ring-offset-2",
                  color === c ? "ring-2 ring-slate-900" : ""
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <button
          onClick={saveProfile}
          disabled={saving === "profile"}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 font-semibold text-white active:bg-brand-700 disabled:opacity-60"
        >
          {saving === "profile" && <Loader2 className="h-5 w-5 animate-spin" />}
          Salvar perfil
        </button>
      </section>

      {/* Orçamento */}
      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-lg font-bold">Orçamento mensal da família</h2>
        <p className="text-sm text-slate-500">
          Limite de gastos usado na barra de alerta do início. Atual: {formatBRL(family?.monthly_budget ?? 0)}
        </p>
        <div className="flex items-center rounded-2xl border border-slate-200 px-4 focus-within:border-brand-500">
          <span className="font-semibold text-slate-400">R$</span>
          <input
            inputMode="decimal"
            value={budgetText}
            onChange={(e) => setBudgetText(e.target.value)}
            placeholder="0,00"
            disabled={!isAdmin}
            className="h-14 w-full bg-transparent px-3 outline-none disabled:text-slate-400"
          />
        </div>
        {isAdmin ? (
          <button
            onClick={saveBudget}
            disabled={saving === "budget"}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-brand-600 font-semibold text-brand-600 active:bg-brand-50 disabled:opacity-60"
          >
            {saving === "budget" && <Loader2 className="h-5 w-5 animate-spin" />}
            Salvar orçamento
          </button>
        ) : (
          <p className="text-xs text-slate-400">Somente administradores podem alterar.</p>
        )}
      </section>

      {/* Membros */}
      <section>
        <h2 className="mb-2 text-lg font-bold">Família</h2>
        <ul className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 p-3">
              <Avatar name={m.full_name} color={m.color} />
              <span className="flex-1 font-semibold">{m.full_name}</span>
              {m.role === "admin" && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">admin</span>
              )}
              {m.id === me.id && <span className="text-xs text-slate-400">você</span>}
            </li>
          ))}
        </ul>
      </section>

      <button
        onClick={logout}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-700 active:bg-slate-50"
      >
        <LogOut className="h-5 w-5" /> Sair
      </button>
    </div>
  );
}
