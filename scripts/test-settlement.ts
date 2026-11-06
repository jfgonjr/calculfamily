// Teste do algoritmo de acerto com os dados do seed (002_seed.sql).
// Rodar: npm run test:settlement  (Node 22.6+)
import assert from "node:assert/strict";
import { computeSettlement } from "../src/lib/settlement.ts";

const members = [
  { id: "a1", name: "Adriana" },
  { id: "a2", name: "Zé Chico" },
  { id: "a3", name: "Junior" },
  { id: "a4", name: "Camila" },
  { id: "a5", name: "Maura" },
];

const expenses = [
  { user_id: "a1", amount: 1800.0 },
  { user_id: "a1", amount: 950.0 },
  { user_id: "a2", amount: 310.5 },
  { user_id: "a2", amount: 280.0 },
  { user_id: "a3", amount: 129.9 },
  { user_id: "a3", amount: 86.4 },
  { user_id: "a4", amount: 420.0 },
  { user_id: "a4", amount: 145.0 },
  { user_id: "a5", amount: 132.7 },
  { user_id: "a5", amount: 97.3 },
];

const r = computeSettlement(members, expenses);

// Total e cota
assert.equal(r.totalCents, 435180);
assert.ok(r.balances.every((b) => b.shareCents === 87036));

// Soma dos saldos = 0 (nenhum centavo criado ou perdido)
assert.equal(r.balances.reduce((s, b) => s + b.balanceCents, 0), 0);

// Transferências quitam todos os saldos
const net = new Map(r.balances.map((b) => [b.id, b.balanceCents]));
for (const t of r.transfers) {
  net.set(t.fromId, net.get(t.fromId)! + t.amountCents);
  net.set(t.toId, net.get(t.toId)! - t.amountCents);
}
assert.ok([...net.values()].every((v) => v === 0));

// Centavos que sobram: 3 pessoas dividindo R$ 0,01 -> ninguém fica com saldo quebrado
const odd = computeSettlement(members.slice(0, 3), [{ user_id: "a1", amount: 0.01 }]);
assert.equal(odd.balances.reduce((s, b) => s + b.balanceCents, 0), 0);

// Participante excluído da divisão: despesa dele é ignorada
const sub = computeSettlement(members.slice(0, 2), [
  { user_id: "a1", amount: 100 },
  { user_id: "a5", amount: 999 },
]);
assert.equal(sub.totalCents, 10000);
assert.equal(sub.transfers.length, 1);
assert.equal(sub.transfers[0]!.amountCents, 5000);

// Sem despesas: sem transferências
assert.equal(computeSettlement(members, []).transfers.length, 0);

console.log("Transferências do seed:");
for (const t of r.transfers) {
  console.log(`  ${t.fromName} -> ${t.toName}: R$ ${(t.amountCents / 100).toFixed(2)}`);
}
console.log("OK: todos os testes passaram");
