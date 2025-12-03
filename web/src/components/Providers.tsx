"use client";

import { SessionProvider } from "next-auth/react";
import ImpersonationBanner from "./ImpersonationBanner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ImpersonationBanner />
      {children}
    </SessionProvider>
  );
}

