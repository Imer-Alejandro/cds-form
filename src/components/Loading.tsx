"use client";

import { useState } from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function LoadingSpinner({ size = "md", text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-slate-200 border-t-blue-500`}
      />
      {text && <p className="text-slate-600">{text}</p>}
    </div>
  );
}

interface SkeletonProps {
  count?: number;
  height?: string;
}

export function Skeleton({ count = 1, height = "h-12" }: SkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} animate-pulse rounded-lg bg-slate-200`}
        />
      ))}
    </div>
  );
}
