import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tenants } from "@/db/schema/tenants";
import { eq } from "drizzle-orm";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";
  const userRole = (session?.user as any)?.role ?? "viewer";
  const tenantId = (session?.user as any)?.tenantId ?? "";

  let tenantName = "Organisation";
  if (tenantId) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.tenantId, tenantId),
      columns: { name: true },
    });
    if (tenant?.name) {
      tenantName = tenant.name;
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        tenantName={tenantName}
      />

      <div className="flex flex-1">
        <Sidebar />

        <main
          className="flex-1 min-w-0"
          style={{ padding: "20px 24px" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
