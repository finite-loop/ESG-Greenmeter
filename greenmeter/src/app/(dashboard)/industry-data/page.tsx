"use client";

import { useRouter } from "next/navigation";
import { SCREEN_ROUTES } from "@/lib/navigation";
import IndustryDataScreen from "@/app/screens/IndustryData";

export default function IndustryDataPage() {
  const router = useRouter();

  const navigate = (screen: string) => {
    const route = SCREEN_ROUTES[screen];
    if (route) router.push(route);
  };

  return <IndustryDataScreen navigate={navigate} />;
}
