import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return { user, profile: profile as Profile | null, supabase };
});

export async function requireUser() {
  const current = await getCurrentUser();
  if (!current || !current.profile) redirect("/login");
  if (!current.profile.is_active) {
    await current.supabase.auth.signOut();
    redirect("/login?erro=inativo");
  }
  return current as { user: NonNullable<typeof current>["user"]; profile: Profile; supabase: NonNullable<typeof current>["supabase"] };
}

export async function requireAdmin() {
  const current = await requireUser();
  if (current.profile.role !== "admin") redirect("/inicio");
  return current;
}

/** Gestor ou admin. */
export async function requireManager() {
  const current = await requireUser();
  if (current.profile.role === "employee") redirect("/inicio");
  return current;
}
