"use server";

import { signIn, signOut } from "@/lib/auth";

export async function signInWithMicrosoft() {
  await signIn("microsoft-entra-id", { redirectTo: "/" });
}

export async function signInWithDevCredentials(email: string) {
  await signIn("dev-credentials", { email, redirectTo: "/" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
