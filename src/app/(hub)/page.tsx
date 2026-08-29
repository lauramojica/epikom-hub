import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HubApp from "@/hub/HubApp";

export const dynamic = "force-dynamic";

export default async function HubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <HubApp authUserId={user.id} />;
}
