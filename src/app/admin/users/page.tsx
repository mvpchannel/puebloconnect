import type { Metadata } from "next";
import { cookies } from "next/headers";
import { listUsers } from "@/lib/db";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/session";
import UserTable from "./UserTable";

export const metadata: Metadata = {
  title: "User Management",
};

export default function UserManagementPage() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;
  // middleware.ts already guarantees this is non-null and role === 'admin'
  // before this page ever renders; the fallback below is just so
  // TypeScript (and anyone reading this in isolation) sees the real type.
  const currentUserId = session?.sub ?? -1;

  const users = listUsers();

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 20 }}>User Management</h2>
        <UserTable initialUsers={users} currentUserId={currentUserId} />
      </div>
    </div>
  );
}
