import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      userId: string;
      tenantId: string;
      role: "admin" | "analyst" | "department" | "viewer";
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId: string;
    tenantId: string;
    role: "admin" | "analyst" | "department" | "viewer";
  }
}
