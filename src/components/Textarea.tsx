"use client";
import React from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function Textarea({ className = "", ...props }: Props) {
  return (
    <textarea
      className={`w-full min-h-[120px] rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-neutral-600 ${className}`}
      {...props}
    />
  );
}
