"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";

export function NavbarWrapper() {
  const pathname = usePathname();

  if (pathname === "/login" || /^\/survey\/[^/]+$/.test(pathname)) {
    return null;
  }

  return <Navbar />;
}
