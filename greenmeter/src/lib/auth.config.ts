import type { NextAuthConfig } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";

/**
 * Auth.js v5 provider configuration.
 * Separated from the main auth.ts so middleware can import without
 * pulling in database dependencies (Edge Runtime compatibility).
 *
 * Environment variables:
 * - AUTH_AZURE_AD_CLIENT_ID — Application (client) ID
 * - AUTH_AZURE_AD_CLIENT_SECRET — Client secret value
 * - AUTH_AZURE_AD_TENANT_ID — Directory (tenant) ID
 * - AUTH_SECRET — NextAuth.js secret for JWT encryption
 * - DEV_AUTH_ENABLED — Set to "true" to enable email-only credentials login (local dev only)
 */
const providers: NextAuthConfig['providers'] = [
  MicrosoftEntraID({
    clientId: process.env.AUTH_AZURE_AD_CLIENT_ID,
    clientSecret: process.env.AUTH_AZURE_AD_CLIENT_SECRET,
    issuer: `https://login.microsoftonline.com/${process.env.AUTH_AZURE_AD_TENANT_ID}/v2.0`,
  }),
];

if (process.env.DEV_AUTH_ENABLED === "true") {
  providers.push(
    Credentials({
      id: "dev-credentials",
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@greenmeter.local" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        if (typeof email !== "string" || !email) return null;
        // Return a minimal user — the jwt/signIn callbacks in auth.ts
        // handle the actual DB lookup and tenant resolution.
        return { id: email, email, name: email.split("@")[0] };
      },
    }),
  );
}

export default {
  providers,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
} satisfies NextAuthConfig;
