import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NavbarWrapper } from "@/components/NavbarWrapper";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Encuestas Sánchez Business",
  description: "Plataforma corporativa de encuestas e indicadores",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#f5f5f5] text-slate-800">
        <NavbarWrapper />
        {children}
      </body>
    </html>
  );
}

