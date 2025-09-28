"use client";
import React from "react";
import clsx from "clsx";

export default function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center font-medium rounded-md transition",
        variant === "primary" && "px-4 py-2 bg-[linear-gradient(180deg,var(--primary),var(--primary-600))] text-white",
        variant === "ghost" && "",
        variant === "danger" && "px-3 py-1 bg-[var(--negative)]/10 text-[var(--negative)] hover:bg-[var(--negative)]/20",
        className
      )}
    >
      {children}
    </button>
  );
}
