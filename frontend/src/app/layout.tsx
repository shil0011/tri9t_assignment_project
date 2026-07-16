import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

import { Providers } from "@/components/providers";

import { MainLayout } from "@/components/layout/main-layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TraceWise AI - QA & Traceability Platform",
  description: "AI-powered Medical Documentation QA & Traceability Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased min-h-screen bg-background flex text-foreground`}>
        <Providers>
          <MainLayout>
            {children}
          </MainLayout>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
