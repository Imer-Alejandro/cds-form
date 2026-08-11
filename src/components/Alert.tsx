"use client";

import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface AlertProps {
  type?: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  onClose?: () => void;
}

export function Alert({ type = "info", title, message, onClose }: AlertProps) {
  const colors = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-900",
    error: "bg-red-50 border-red-200 text-red-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    info: "bg-teal-50 border-teal-200 text-teal-900",
  };

  const iconColors = {
    success: "text-emerald-600",
    error: "text-red-600",
    warning: "text-amber-600",
    info: "text-[#0d7377]",
  };

  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg border p-4 ${colors[type]}`}
    >
      <div className="flex items-start gap-3">
        <span className={`text-xl font-bold ${iconColors[type]}`}>
          {icons[type]}
        </span>
        <div className="flex-1">
          <h3 className="font-semibold">{title}</h3>
          {message && <p className="text-sm opacity-90">{message}</p>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="opacity-50 hover:opacity-100"
          >
            ✕
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function showToast(
  message: string,
  type: "success" | "error" | "loading" = "success"
) {
  if (type === "success") {
    toast.success(message);
  } else if (type === "error") {
    toast.error(message);
  } else {
    toast.loading(message);
  }
}
