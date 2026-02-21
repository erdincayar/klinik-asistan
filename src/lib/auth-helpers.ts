import { auth } from "./auth";
import { redirect } from "next/navigation";

export async function getSession() {
  const session = await auth();
  return session;
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function getClinicId(): Promise<string> {
  const session = await requireAuth();
  const clinicId = (session.user as any).clinicId;
  if (!clinicId) {
    redirect("/login");
  }
  return clinicId;
}
