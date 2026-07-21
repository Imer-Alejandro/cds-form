"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-slate-900">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white">
                📋
              </div>
              CDS Form
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 transition">
                Dashboard
              </Link>
              <Link href="/survey/new" className="text-slate-600 hover:text-slate-900 transition">
                Nueva Encuesta
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition">
              Perfil
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Salir
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg hover:bg-slate-100"
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
            className="md:hidden pb-4 space-y-2"
          >
            <Link href="/dashboard" className="block px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              Dashboard
            </Link>
            <Link href="/survey/new" className="block px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              Nueva Encuesta
            </Link>
          </motion.div>
        )}
      </div>
    </nav>
  );
}
