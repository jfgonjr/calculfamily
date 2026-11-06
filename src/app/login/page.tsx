"use client";

import { useState } from "react";
import { Loader2, Mail, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }
    window.location.href = "/";
  }

  async function sendMagicLink() {
    if (!email) {
      setError("Digite seu e-mail para receber o link.");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // só quem a família já cadastrou pode entrar
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError("Não foi possível enviar o link. Confira o e-mail.");
      return;
    }
    setInfo("Link enviado! Abra o e-mail neste celular e toque no link.");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
          <Wallet className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Calculadora Familioa</h1>
        <p className="mt-1 text-slate-500">Entre para ver as contas da família</p>
      </div>

      <form onSubmit={signInWithPassword} className="space-y-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-brand-500"
        />
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-brand-500"
        />

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {info && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{info}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 font-semibold text-white active:bg-brand-700 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          Entrar
        </button>

        <button
          type="button"
          onClick={sendMagicLink}
          disabled={loading}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-700 active:bg-slate-50 disabled:opacity-50"
        >
          <Mail className="h-5 w-5" />
          Receber link por e-mail
        </button>
      </form>
    </main>
  );
}
