export type TransactionType = "income" | "expense";
export type TransactionStatus = "paid" | "pending";

export interface Family {
  id: string;
  name: string;
  monthly_budget: number;
  created_at: string;
}

export interface Profile {
  id: string;
  family_id: string;
  full_name: string;
  color: string;
  avatar_url: string | null;
  role: "admin" | "member";
}

export interface Category {
  id: string;
  family_id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  family_id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  amount: number;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  status: TransactionStatus;
  notes: string | null;
  created_at: string;
}
