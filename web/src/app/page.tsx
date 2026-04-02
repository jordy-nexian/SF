import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Authenticated users go straight to admin dashboard
  if (session) {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: '#0f172a' }}>
      {/* Background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute rounded-full"
          style={{
            width: '500px',
            height: '500px',
            background: 'rgba(99, 102, 241, 0.2)',
            filter: 'blur(120px)',
            top: '-150px',
            left: '-150px',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '400px',
            height: '400px',
            background: 'rgba(139, 92, 246, 0.2)',
            filter: 'blur(120px)',
            bottom: '-100px',
            right: '-100px',
          }}
        />
      </div>


      {/* Main — vertically centred */}
      <main className="relative flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center py-20">
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8"
            style={{ background: 'linear-gradient(to bottom right, #6366f1, #8b5cf6)' }}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold mb-3">Stateless Forms</h1>
          <p className="text-base mb-10" style={{ color: '#94a3b8' }}>
            Secure document management and form assignment portal.
            Sign in to access your dashboard.
          </p>

          <Link
            href="/signin"
            className="inline-block w-full px-6 py-3.5 rounded-xl font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
            }}
          >
            Sign in
          </Link>

          <div className="mt-6 flex items-center justify-center gap-6 text-xs" style={{ color: '#64748b' }}>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              HMAC signed
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              End-to-end encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              No data stored
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative py-6 px-6 text-center" style={{ borderTop: '1px solid #1e293b' }}>
        <span className="text-xs" style={{ color: '#475569' }}>
          &copy; {new Date().getFullYear()} Stateless Forms
        </span>
      </footer>
    </div>
  );
}
