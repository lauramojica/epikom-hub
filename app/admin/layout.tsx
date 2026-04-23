import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: me } = await supabase
    .from("users")
    .select("role, name")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard");

  const firstName = (me?.name ?? "admin").split(" ")[0];
  return (
    <AppShell role="admin" firstName={firstName}>
      {children}
    </AppShell>
  );
}
