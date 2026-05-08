"use client";

import { useRouter } from "next/navigation";
import { SCREEN_ROUTES } from "@/lib/navigation";
import SettingsScreen from "@/app/screens/Settings";

export default function SettingsPage() {
  const router = useRouter();

  const navigate = (screen: string) => {
    const route = SCREEN_ROUTES[screen];
    if (route) router.push(route);
  };

  return <SettingsScreen navigate={navigate} />;
}
