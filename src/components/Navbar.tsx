"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <nav className="bg-[#0d7377] text-white shadow-md sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 font-bold text-xl tracking-tight text-white">
              <div className="w-8 h-8 bg-white/10 rounded-md flex items-center justify-center text-white border border-white/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span>Encuestas Sánchez Business</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/dashboard" className="text-white/80 hover:text-white transition-colors py-1 border-b-2 border-transparent hover:border-white/40">
                Dashboard
              </Link>
              <Link href="/survey/new" className="text-white/80 hover:text-white transition-colors py-1 border-b-2 border-transparent hover:border-white/40">
                Nueva Encuesta
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 text-sm font-medium">
            {authenticated ? (
              <>
                <Link href="/dashboard" className="px-3.5 py-1.5 text-white/90 hover:text-white hover:bg-white/10 rounded-md transition">
                  Mi cuenta
                </Link>
                <button onClick={handleLogout} className="px-4 py-1.5 bg-[#e8722a] text-white font-semibold rounded-md hover:bg-[#c95d1b] transition shadow-sm">
                  Salir
                </button>
              </>
            ) : (
              <Link href="/login" className="px-4 py-1.5 bg-[#e8722a] text-white font-semibold rounded-md hover:bg-[#c95d1b] transition shadow-sm">
                Iniciar sesión
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md hover:bg-white/10 text-white"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden pb-4 space-y-2 text-sm"
          >
            <Link href="/dashboard" className="block px-4 py-2 text-white/90 hover:bg-white/10 rounded-md">
              Dashboard
            </Link>
            <Link href="/survey/new" className="block px-4 py-2 text-white/90 hover:bg-white/10 rounded-md">
              Nueva Encuesta
            </Link>
          </motion.div>
        )}
      </div>
    </nav>
  );
}

