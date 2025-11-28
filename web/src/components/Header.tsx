"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Check if we're on an admin page
  const isAdminPage = pathname?.startsWith("/admin");

  // Loading state - show minimal header
  if (status === "loading") {
    return (
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <Link href="/" className="text-lg font-semibold">Stateless Forms</Link>
          <div className="h-8 w-16"></div>
        </div>
      </header>
    );
  }

  // User is logged in
  if (session) {
    return (
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <Link href="/" className="text-lg font-semibold">Stateless Forms</Link>
          <nav className="flex items-center gap-4 text-sm text-gray-700">
            {isAdminPage ? (
              <>
                {/* Admin navigation is handled by admin layout */}
              </>
            ) : (
              <>
                <Link href="/admin" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
              </>
            )}
            <span className="text-gray-500">{session.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded border px-3 py-1 text-gray-700 hover:bg-gray-50"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>
    );
  }

  // User is not logged in - show only Login on public pages
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <Link href="/" className="text-lg font-semibold">Stateless Forms</Link>
        <nav className="flex items-center gap-4 text-sm text-gray-700">
          <Link href="/signin" className="rounded border px-3 py-1 hover:bg-gray-50">
            Log in
          </Link>
        </nav>
      </div>
    </header>
  );
}

