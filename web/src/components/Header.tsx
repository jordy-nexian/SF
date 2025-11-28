"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Admin pages have their own header - don't render global header
  const isAdminPage = pathname?.startsWith("/admin");
  if (isAdminPage) {
    return null;
  }

  // Public form pages don't need a header
  const isFormPage = pathname?.startsWith("/f/");
  if (isFormPage) {
    return null;
  }

  // Check if we're on the dark-themed landing page
  const isDarkPage = pathname === "/" || pathname === "/features" || pathname === "/pricing";

  // Loading state - show minimal header
  if (status === "loading") {
    return (
      <header className={`fixed top-0 left-0 right-0 z-50 ${isDarkPage ? "bg-transparent" : "border-b bg-white"}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4 px-6">
          <Link href="/" className={`text-lg font-semibold ${isDarkPage ? "gradient-text" : ""}`}>
            Stateless Forms
          </Link>
          <div className="h-8 w-16"></div>
        </div>
      </header>
    );
  }

  // User is logged in - show Dashboard link and Log out
  if (session) {
    return (
      <header className={`fixed top-0 left-0 right-0 z-50 ${isDarkPage ? "bg-slate-900/80 backdrop-blur-md border-b border-slate-800" : "border-b bg-white"}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4 px-6">
          <Link href="/" className={`text-lg font-semibold ${isDarkPage ? "gradient-text" : ""}`}>
            Stateless Forms
          </Link>
          <nav className={`flex items-center gap-4 text-sm ${isDarkPage ? "text-slate-300" : "text-gray-700"}`}>
            <Link 
              href="/admin" 
              className={`${isDarkPage ? "text-slate-400 hover:text-white" : "text-gray-600 hover:text-gray-900"} transition-colors`}
            >
              Dashboard
            </Link>
            <span className={isDarkPage ? "text-slate-500" : "text-gray-500"}>{session.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className={`rounded-full px-4 py-1.5 transition-all ${
                isDarkPage 
                  ? "border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600" 
                  : "border text-gray-700 hover:bg-gray-50"
              }`}
            >
              Log out
            </button>
          </nav>
        </div>
      </header>
    );
  }

  // User is not logged in - show only Login
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 ${isDarkPage ? "bg-transparent" : "border-b bg-white"}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between p-4 px-6">
        <Link href="/" className={`text-lg font-semibold ${isDarkPage ? "gradient-text" : ""}`}>
          Stateless Forms
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link 
            href="/signin" 
            className={`rounded-full px-4 py-1.5 transition-all ${
              isDarkPage 
                ? "border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-indigo-500" 
                : "border text-gray-700 hover:bg-gray-50"
            }`}
          >
            Log in
          </Link>
        </nav>
      </div>
    </header>
  );
}

