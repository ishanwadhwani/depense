"use client";
import React from "react";
import clsx from "clsx";

export default function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx("w-full rounded-md px-3 py-2 border border-transparent focus:outline-none focus:ring-2", props.className)}
      style={{ boxShadow: "inset 0 1px 0 rgba(0,0,0,0.02)" }}
    />
  );
}
