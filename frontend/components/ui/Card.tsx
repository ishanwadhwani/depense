"use client";
import React from "react";
import clsx from "clsx";

export default function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("card p-4", className)}>{children}</div>;
}
