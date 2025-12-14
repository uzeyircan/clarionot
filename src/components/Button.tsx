"use client";

import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export default function Button({ variant = "primary", className = "", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition active:scale-[0.99]";
  const styles =
    variant === "primary"
      ? "bg-neutral-100 text-neutral-950 hover:bg-neutral-200"
      : variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-500"
      : "bg-transparent text-neutral-100 hover:bg-neutral-900 border border-neutral-800";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
