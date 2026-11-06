"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { currentMonth, monthRange, type MonthRef } from "@/lib/format";
import type { Category, Family, Profile, Transaction } from "@/types";

interface FamilyState {
  loading: boolean;
  error: string | null;
  me: Profile | null;
  family: Family | null;
  members: Profile[];
  categories: Category[];
  transactions: Transaction[]; // do mês selecionado
  month: MonthRef;
  setMonth: (m: MonthRef) => void;
  reload: () => Promise<void>;
  reloadBase: () => Promise<void>;
  memberById: (id: string) => Profile | undefined;
  categoryById: (id: string | null) => Category | undefined;
}

const Ctx = createContext<FamilyState | null>(null);

export function useFamily(): FamilyState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFamily deve ser usado dentro de <FamilyProvider>");
  return v;
}

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [month, setMonth] = useState<MonthRef>(currentMonth());

  const monthRef = useRef(month);
  monthRef.current = month;

  const loadTransactions = useCallback(async () => {
    const { start, end } = monthRange(monthRef.current);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      setError("Não foi possível carregar os lançamentos.");
      return;
    }
    setError(null);
    setTransactions(
      (data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })) as Transaction[]
    );
  }, [supabase]);

  const loadBase = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (pErr || !profile) {
      setError(
        "Seu usuário ainda não está vinculado a uma família. Peça para a administradora cadastrar seu acesso."
      );
      setLoading(false);
      return;
    }

    const [fam, mem, cat] = await Promise.all([
      supabase.from("families").select("*").eq("id", profile.family_id).single(),
      supabase.from("profiles").select("*").eq("family_id", profile.family_id).order("full_name"),
      supabase.from("categories").select("*").eq("family_id", profile.family_id).order("name"),
    ]);

    setMe(profile as Profile);
    if (fam.data) setFamily({ ...fam.data, monthly_budget: Number(fam.data.monthly_budget) } as Family);
    setMembers((mem.data ?? []) as Profile[]);
    setCategories((cat.data ?? []) as Category[]);
  }, [supabase]);

  // Carga inicial
  useEffect(() => {
    (async () => {
      await loadBase();
      await loadTransactions();
      setLoading(false);
    })();
  }, [loadBase, loadTransactions]);

  // Recarrega ao trocar de mês
  useEffect(() => {
    if (!me) return;
    loadTransactions();
  }, [month, me, loadTransactions]);

  // Realtime: qualquer alteração da família atualiza todos os celulares
  useEffect(() => {
    if (!me) return;
    const channel = supabase
      .channel(`familia-${me.family_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `family_id=eq.${me.family_id}` },
        () => loadTransactions()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories", filter: `family_id=eq.${me.family_id}` },
        () => loadBase()
      )
      .subscribe();

    // Ao voltar para o app (aba/PWA reaberto), garante dados frescos
    const onVisible = () => {
      if (document.visibilityState === "visible") loadTransactions();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      supabase.removeChannel(channel);
    };
  }, [me, supabase, loadTransactions, loadBase]);

  const value = useMemo<FamilyState>(
    () => ({
      loading,
      error,
      me,
      family,
      members,
      categories,
      transactions,
      month,
      setMonth,
      reload: loadTransactions,
      reloadBase: loadBase,
      memberById: (id) => members.find((m) => m.id === id),
      categoryById: (id) => (id ? categories.find((c) => c.id === id) : undefined),
    }),
    [loading, error, me, family, members, categories, transactions, month, loadTransactions, loadBase]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
