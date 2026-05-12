"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { signOutAction } from "@/lib/auth-actions";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar onSignOut={() => signOutAction()} />

      <div className="flex flex-1">
        <Sidebar />

        <main
          className="flex-1 min-w-0"
          style={{ padding: "20px 24px" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
