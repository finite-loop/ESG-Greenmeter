"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { SCREEN_ROUTES } from "@/lib/navigation";
import KnowledgeScreen from "@/app/screens/Knowledge";

function KnowledgeContent() {
  const router = useRouter();

  const navigate = (screen: string) => {
    const route = SCREEN_ROUTES[screen];
    if (route) router.push(route);
  };

  return <KnowledgeScreen navigate={navigate} />;
}

export default function KnowledgePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-xs text-[var(--tx3)]">
          Loading knowledge base...
        </div>
      }
    >
      <KnowledgeContent />
    </Suspense>
  );
}
