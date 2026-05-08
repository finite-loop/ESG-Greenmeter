"use client";

import { useRouter } from "next/navigation";
import { SCREEN_ROUTES } from "@/lib/navigation";
import SupplyChainScreen from "@/app/screens/SupplyChain";

export default function SupplyChainPage() {
  const router = useRouter();

  const navigate = (screen: string) => {
    const route = SCREEN_ROUTES[screen];
    if (route) router.push(route);
  };

  return <SupplyChainScreen navigate={navigate} />;
}
