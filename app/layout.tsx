import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "@/lib/query";
import { QuickActionsProvider } from "@/src/contexts/QuickActionsContext";
import { QuickActionsFAB } from "@/src/components/QuickActionsFAB";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shop CMS - 商品管理系统",
  description: "现代化的商品管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        <ReactQueryProvider>
          <QuickActionsProvider>
            {children}
            <QuickActionsFAB />
          </QuickActionsProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
