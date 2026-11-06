import { FamilyProvider } from "@/components/providers/FamilyProvider";
import { TransactionEditorProvider } from "@/components/transactions/EditorProvider";
import { BottomNav } from "@/components/layout/BottomNav";
import { AppHeader } from "@/components/layout/AppHeader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FamilyProvider>
      <TransactionEditorProvider>
        <div className="mx-auto min-h-dvh max-w-md">
          <AppHeader />
          <main className="pb-nav px-4">{children}</main>
        </div>
        <BottomNav />
      </TransactionEditorProvider>
    </FamilyProvider>
  );
}
