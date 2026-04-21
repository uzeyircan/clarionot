"use client";
import React from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function Textarea({ className = "", ...props }: Props) {
  return (
    <textarea
      className={`theme-field w-full min-h-[120px] rounded-lg px-3 py-2 text-sm outline-none ${className}`}
      {...props}
    />
  );
}
