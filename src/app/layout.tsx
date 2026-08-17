import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { authEnabled } from "@/lib/user-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Consensus Multi-LLM",
  description: "Plusieurs modèles LLM analysent votre question en collaboration : l'orchestrateur consolide les analyses, puis produit une synthèse finale nuancée.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const body = (
    <body className={`${inter.variable} antialiased`}>{children}</body>
  );
  if (!authEnabled()) return <html lang="fr">{body}</html>;
  return (
    <html lang="fr">
      <ClerkProvider>{body}</ClerkProvider>
    </html>
  );
}