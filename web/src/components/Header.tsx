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

  // Check if we're on the dark-themed pages
  const isDarkPage = pathname === "/" || pathname === "/features" || pathname === "/pricing" || pathname === "/signin";

  const gradientTextStyle = {
    background: 'linear-gradient(to right, #818cf8, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties;

  // Loading state - show minimal header
  if (status === "loading") {
    return (
      <header 
        className="fixed top-0 left-0 right-0 z-50"
        style={isDarkPage ? {} : { borderBottom: '1px solid #e5e7eb', background: 'white' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4 px-6">
          <Link href="/" className="text-lg font-semibold" style={isDarkPage ? gradientTextStyle : { color: '#111827' }}>
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
      <header 
        className="fixed top-0 left-0 right-0 z-50"
        style={isDarkPage ? { 
          background: 'rgba(15, 23, 42, 0.8)', 
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1e293b' 
        } : { 
          borderBottom: '1px solid #e5e7eb', 
          background: 'white' 
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4 px-6">
          <Link href="/" className="text-lg font-semibold" style={isDarkPage ? gradientTextStyle : { color: '#111827' }}>
            Stateless Forms
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link 
              href="/admin" 
              className="transition-colors"
              style={{ color: isDarkPage ? '#94a3b8' : '#4b5563' }}
            >
              Dashboard
            </Link>
            <span style={{ color: isDarkPage ? '#64748b' : '#6b7280' }}>{session.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-full px-4 py-1.5 transition-all"
              style={isDarkPage ? {
                border: '1px solid #334155',
                color: '#cbd5e1',
              } : {
                border: '1px solid #d1d5db',
                color: '#374151',
              }}
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
    <header 
      className="fixed top-0 left-0 right-0 z-50"
      style={isDarkPage ? {} : { borderBottom: '1px solid #e5e7eb', background: 'white' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between p-4 px-6">
        <Link href="/" className="text-lg font-semibold" style={isDarkPage ? gradientTextStyle : { color: '#111827' }}>
          Stateless Forms
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link 
            href="/signin" 
            className="rounded-full px-4 py-1.5 transition-all"
            style={isDarkPage ? {
              border: '1px solid #334155',
              color: '#cbd5e1',
            } : {
              border: '1px solid #d1d5db',
              color: '#374151',
            }}
          >
            Log in
          </Link>
        </nav>
      </div>
    </header>
  );
}
