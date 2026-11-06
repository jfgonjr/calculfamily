"use client";

import { createContext, useContext, useState } from "react";
import { Plus } from "lucide-react";
import { TransactionForm } from "./TransactionForm";
import type { Transaction } from "@/types";

interface EditorApi {
  openNew: () => void;
  openEdit: (t: Transaction) => void;
}

const Ctx = createContext<EditorApi | null>(null);

export function useTransactionEditor(): EditorApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTransactionEditor fora do <TransactionEditorProvider>");
  return v;
}

export function TransactionEditorProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formKey, setFormKey] = useState(0); // reinicia o formulário a cada abertura

  const api: EditorApi = {
    openNew: () => {
      setEditing(null);
      setFormKey((k) => k + 1);
      setOpen(true);
    },
    openEdit: (t) => {
      setEditing(t);
      setFormKey((k) => k + 1);
      setOpen(true);
    },
  };

  return (
    <Ctx.Provider value={api}>
      {children}

      {/* Botão flutuante "Novo lançamento" */}
      <button
        onClick={api.openNew}
        aria-label="Novo lançamento"
        className="fixed right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl active:scale-95 active:bg-brand-700"
        style={{ bottom: "calc(5rem + var(--safe-bottom))" }}
      >
        <Plus className="h-8 w-8" strokeWidth={2.6} />
      </button>

      {open && (
        <TransactionForm key={formKey} editing={editing} onClose={() => setOpen(false)} />
      )}
    </Ctx.Provider>
  );
}
