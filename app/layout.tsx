import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Epikom Ops Hub",
  description: "Hub interno del crew de Epikom Interactive.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans antialiased bg-white text-neutral-900`}>
        {children}
      </body>
    </html>
  );
}
