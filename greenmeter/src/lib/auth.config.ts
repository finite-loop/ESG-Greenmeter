import type { NextAuthConfig } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

/**
 * Auth.js v5 provider configuration.
 * Separated from the main auth.ts so middleware can import without
 * pulling in database dependencies (Edge Runtime compatibility).
 *
 * The Credentials provider is defined in auth.ts (requires DB access
 * for password verification).
 */
const providers: NextAuthConfig['providers'] = [];

if (
  process.env.AUTH_AZURE_AD_CLIENT_ID &&
  process.env.AUTH_AZURE_AD_CLIENT_SECRET &&
  process.env.AUTH_AZURE_AD_TENANT_ID
) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AUTH_AZURE_AD_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_AZURE_AD_TENANT_ID}/v2.0`,
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
