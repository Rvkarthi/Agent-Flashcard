"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: "indigo" | "purple" | "emerald" | "amber" | "rose" | "neutral";
  size?: "sm" | "md";
  className?: string;
  icon?: React.ReactNode;
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  children,
  variant = "neutral",
  size = "sm",
  className,
  icon,
}) => {
  const variantStyles = {
    indigo:
      "bg-indigo-500/10 text-indigo-300 border-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.15)]",
    purple:
      "bg-purple-500/10 text-purple-300 border-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.15)]",
    emerald:
      "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
    amber:
      "bg-amber-500/10 text-amber-300 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
    rose:
      "bg-rose-500/10 text-rose-300 border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
    neutral:
      "bg-zinc-800/50 text-zinc-300 border-zinc-700/40 shadow-sm",
  };

  const sizeStyles = {
    sm: "text-xs px-2.5 py-0.5 rounded-full font-medium gap-1.5",
    md: "text-sm px-3 py-1 rounded-full font-medium gap-2",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center backdrop-blur-md border transition-all duration-200",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
