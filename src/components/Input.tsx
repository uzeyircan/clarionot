"use client";
import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className = "", ...props }: Props) {
  return (
    <input
      className={`w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-neutral-600 ${className}`}
      {...props}
    />
  );
}
