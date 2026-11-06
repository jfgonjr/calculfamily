const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export interface MonthRef {
  year: number;
  month: number; // 0-11
}

export function currentMonth(): MonthRef {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function shiftMonth(m: MonthRef, delta: number): MonthRef {
  const total = m.year * 12 + m.month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

export function monthLabel(m: MonthRef): string {
  return `${MONTHS[m.month]}/${m.year}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Intervalo [start, end) em YYYY-MM-DD para filtrar o mês no banco. */
export function monthRange(m: MonthRef): { start: string; end: string } {
  const next = shiftMonth(m, 1);
  return {
    start: `${m.year}-${pad(m.month + 1)}-01`,
    end: `${next.year}-${pad(next.month + 1)}-01`,
  };
}

/** Data de hoje local em YYYY-MM-DD (evita o bug de fuso do toISOString). */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Data padrão para novo lançamento: hoje, se estiver no mês exibido; senão dia 1 do mês. */
export function defaultDateFor(m: MonthRef): string {
  const now = currentMonth();
  if (now.year === m.year && now.month === m.month) return todayISO();
  return monthRange(m).start;
}

export function formatDateBR(iso: string): string {
  const [y, mo, d] = iso.split("-");
  return `${d}/${mo}/${y}`;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(value: number): string {
  return brl.format(value);
}

/** Converte texto digitado ("1.234,56", "12,5", "12.50") em número. NaN se inválido. */
export function parseBRL(input: string): number {
  let s = input.trim().replace(/[^\d.,]/g, "");
  if (!s) return NaN;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if ((s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
