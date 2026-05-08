import NextAuth from "next-auth";
import { eq } from "drizzle-orm";
import authConfig from "./auth.config";

/**
 * Lazily imports the database module to prevent build-time errors
 * when DATABASE_URL is not available (e.g., during static analysis).
 */
async function getDb() {
  const { db } = await import("@/db");
  return db;
}

async function getUsersTable() {
  const { users } = await import("@/db/schema");
  return users;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // On initial sign-in, look up user in our database.
      // For OAuth providers, email comes from `profile`.
      // For credentials provider, email comes from `user` (authorize return).
      const email = profile?.email ?? user?.email;
      if (account && email) {
        const db = await getDb();
        const users = await getUsersTable();

        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (dbUser) {
          token.userId = dbUser.userId;
          token.tenantId = dbUser.tenantId;
          token.role = dbUser.role as "admin" | "analyst" | "department" | "viewer";
        } else {
          // User not found in DB — deny access
          token.userId = "";
          token.tenantId = "";
          token.role = "viewer";
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Expose custom claims from JWT to the client session
      if (token.userId) {
        session.user.userId = token.userId;
        session.user.tenantId = token.tenantId;
        session.user.role = token.role;
      }

      return session;
    },

    async signIn({ profile, user, account }) {
      // For OAuth providers, email comes from `profile`.
      // For credentials provider, email comes from `user`.
      const email = profile?.email ?? user?.email;
      if (!email) {
        return false;
      }

      const db = await getDb();
      const users = await getUsersTable();

      const dbUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!dbUser) {
        // Unknown user — deny access
        return "/access-denied";
      }

      if (dbUser.status !== 'active') {
        // User exists but inactive (pending invitation) — activate on first sign-in
        await db
          .update(users)
          .set({ status: 'active', updatedAt: new Date() })
          .where(eq(users.userId, dbUser.userId));
      }

      return true;
    },
  },
});
