"use client";
import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className = "", ...props }: Props) {
  return (
    <input
      className={`theme-field w-full rounded-lg px-3 py-2 text-sm outline-none ${className}`}
      {...props}
    />
  );
}
