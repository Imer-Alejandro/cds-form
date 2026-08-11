"use client";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  children,
  ...props
}: ButtonProps) {
  const variantClasses = {
    primary:
      "bg-[#0d7377] text-white hover:bg-[#0a5c5f] disabled:bg-slate-300 shadow-sm",
    secondary:
      "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100 shadow-sm",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 shadow-sm",
    success:
      "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300 shadow-sm",
  };

  const sizeClasses = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      disabled={loading || disabled}
      className={`
        rounded-lg font-medium transition-all duration-200
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${loading ? "cursor-not-allowed opacity-75" : ""}
      `}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
