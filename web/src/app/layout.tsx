import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stateless Forms → n8n",
  description: "Schema-driven forms with real-time relay to n8n (no answers stored).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
            <Link href="/" className="text-lg font-semibold">Stateless Forms</Link>
            <nav className="flex items-center gap-4 text-sm text-gray-700">
              <Link href="/admin">Admin</Link>
              <Link href="/admin/forms/new" className="text-blue-600">Create form</Link>
              <Link href="/signin">Sign in</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
