"use client";

import { useRouter } from "next/navigation";
import { SCREEN_ROUTES } from "@/lib/navigation";
import ReportsScreen from "@/app/screens/Reports";

export default function ReportsPage() {
  const router = useRouter();

  const navigate = (screen: string) => {
    const route = SCREEN_ROUTES[screen];
    if (route) router.push(route);
  };

  return <ReportsScreen navigate={navigate} />;
}
