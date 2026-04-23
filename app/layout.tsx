import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Epikom Ops Hub",
  description: "Hub interno del crew de Epikom Interactive.",
};

// Inline script runs before paint to avoid light→dark flash on load.
const themeScript = `
(function(){try{
  var t=localStorage.getItem('theme');
  if(t!=='dark'&&t!=='light'){
    t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  }
  document.documentElement.setAttribute('data-theme',t);
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
