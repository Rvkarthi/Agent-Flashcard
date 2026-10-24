"use client";
import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface InteractiveButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "glass" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const InteractiveButton: React.FC<InteractiveButtonProps> = ({
  variant = "primary",
  size = "md",
  icon,
  children,
  className,
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary:
      "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] border border-white/20",
    secondary:
      "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm hover:border-zinc-500",
    glass:
      "bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.12] backdrop-blur-md hover:border-white/[0.25] shadow-[0_4px_20px_rgba(0,0,0,0.25)]",
    danger:
      "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]",
    ghost:
      "bg-transparent hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-100 border border-transparent",
  };

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5 font-medium",
    md: "text-sm px-4 py-2 rounded-xl gap-2 font-medium",
    lg: "text-base px-6 py-3 rounded-xl gap-2.5 font-semibold",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -1 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      disabled={disabled}
      className={cn(
        "relative inline-flex items-center justify-center transition-colors select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </motion.button>
  );
};
