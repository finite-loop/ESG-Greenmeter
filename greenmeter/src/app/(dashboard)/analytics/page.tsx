"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SCREEN_ROUTES } from "@/lib/navigation";
import AnalyticsScreen from "@/app/screens/Analytics";

export default function AnalyticsPage() {
  const router = useRouter();
  const [rollupLevel, setRollupLevel] = useState("organization");

  const navigate = (screen: string) => {
    const route = SCREEN_ROUTES[screen];
    if (route) router.push(route);
  };

  const NoOpRollupBar = ({}: { active: string; onSet: (id: string) => void }) => null;

  return (
    <AnalyticsScreen
      navigate={navigate}
      rollupLevel={rollupLevel}
      setRollupLevel={setRollupLevel}
      RollupBar={NoOpRollupBar}
    />
  );
}
