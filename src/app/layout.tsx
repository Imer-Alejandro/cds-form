import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NavbarWrapper } from "@/components/NavbarWrapper";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Encuestas Sánchez Business",
  description: "Plataforma corporativa de encuestas e indicadores",
  applicationName: "Encuestas Sánchez Business",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Encuestas",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d7377",
  width: "device-width",
  initialScale: 1,
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
        <PwaRegister />
        <NavbarWrapper />
        {children}
      </body>
    </html>
  );
}

