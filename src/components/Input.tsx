"use client";
import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className = "", ...props }: Props) {
  return (
    <input
      className={`w-full rounded-lg border border-white/10 bg-[#07090d] px-3 py-2 text-sm text-white outline-none placeholder:text-white/34 focus:border-cyan-200/50 ${className}`}
      {...props}
    />
  );
}
