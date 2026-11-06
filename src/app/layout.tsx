import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterSW } from "@/components/layout/RegisterSW";

export const metadata: Metadata = {
  title: "Calculadora Familioa",
  description: "Finanças da família: lançamentos e acerto de contas mensal.",
  applicationName: "Calculadora Familioa",
  appleWebApp: { capable: true, title: "Familioa", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
