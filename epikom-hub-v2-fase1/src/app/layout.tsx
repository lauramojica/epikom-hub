import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Epikom Hub - Panel de Gestión de Proyectos",
  description: "Sistema de gestión de proyectos para Epikom y sus clientes",
  icons: {
    icon: "/favicon.ico",
  },
};

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
