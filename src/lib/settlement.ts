// Algoritmo de acerto de contas. Trabalha em CENTAVOS (inteiros) para nunca
// perder ou criar dinheiro por arredondamento.

export interface SettlementMember {
  id: string;
  name: string;
}

export interface SettlementExpense {
  user_id: string;
  amount: number; // em reais
}

export interface MemberBalance {
  id: string;
  name: string;
  paidCents: number;
  shareCents: number;
  balanceCents: number; // >0 deve receber, <0 deve pagar
}

export interface Transfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountCents: number;
}

export interface SettlementResult {
  totalCents: number;
  balances: MemberBalance[];
  transfers: Transfer[];
}

const toCents = (v: number) => Math.round(v * 100);

/**
 * @param members  participantes da divisão (quem divide a conta)
 * @param expenses despesas PAGAS do mês (qualquer user_id; só conta quem está em members)
 */
export function computeSettlement(
  members: SettlementMember[],
  expenses: SettlementExpense[]
): SettlementResult {
  const ids = new Set(members.map((m) => m.id));
  const paid = new Map<string, number>(members.map((m) => [m.id, 0]));

  for (const e of expenses) {
    if (ids.has(e.user_id)) paid.set(e.user_id, (paid.get(e.user_id) ?? 0) + toCents(e.amount));
  }

  const totalCents = [...paid.values()].reduce((a, b) => a + b, 0);
  const n = members.length;
  if (n === 0) return { totalCents: 0, balances: [], transfers: [] };

  // Divide o total; os centavos que sobram vão 1 a 1 para os primeiros (ordem estável por id)
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  const ordered = [...members].sort((a, b) => a.id.localeCompare(b.id));
  const extra = new Map(ordered.map((m, i) => [m.id, i < remainder ? 1 : 0]));

  const balances: MemberBalance[] = members.map((m) => {
    const paidCents = paid.get(m.id) ?? 0;
    const shareCents = base + (extra.get(m.id) ?? 0);
    return { id: m.id, name: m.name, paidCents, shareCents, balanceCents: paidCents - shareCents };
  });

  // Casamento guloso: maior devedor paga ao maior credor (poucas transferências)
  const debtors = balances
    .filter((b) => b.balanceCents < 0)
    .map((b) => ({ ...b, left: -b.balanceCents }))
    .sort((a, b) => b.left - a.left);
  const creditors = balances
    .filter((b) => b.balanceCents > 0)
    .map((b) => ({ ...b, left: b.balanceCents }))
    .sort((a, b) => b.left - a.left);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i]!;
    const c = creditors[j]!;
    const amount = Math.min(d.left, c.left);
    if (amount > 0) {
      transfers.push({
        fromId: d.id,
        fromName: d.name,
        toId: c.id,
        toName: c.name,
        amountCents: amount,
      });
    }
    d.left -= amount;
    c.left -= amount;
    if (d.left === 0) i++;
    if (c.left === 0) j++;
  }

  return { totalCents, balances, transfers };
}
