"use client";

import { SessionProvider } from "next-auth/react";

export default function ExpiredLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
