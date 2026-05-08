"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { RollupBar } from "@/components/layout/RollupBar";
import { ROLLUP_LEVELS } from "../data";
import { signOutAction } from "@/lib/auth-actions";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [rollupLevel, setRollupLevel] = useState("organization");

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar onSignOut={() => signOutAction()} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex flex-1 flex-col overflow-hidden">
          <RollupBar
            levels={ROLLUP_LEVELS}
            activeLevel={rollupLevel}
            onSetLevel={setRollupLevel}
          />

          <div className="flex-1 overflow-y-auto p-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
