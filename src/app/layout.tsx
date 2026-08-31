import type { Metadata } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  let icon = "/favicon.ico";
  let title = "Epikom Hub";
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("agency_settings")
      .select("favicon_url, icon_url, logo_url, name").eq("id", 1).single();
    if (data) {
      icon = data.favicon_url || data.icon_url || data.logo_url || icon;
      title = data.name ? `${data.name} · Hub` : title;
    }
  } catch {}
  return {
    title,
    description: "Sistema de gestión de proyectos para Epikom y sus clientes",
    icons: { icon },
  };
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
