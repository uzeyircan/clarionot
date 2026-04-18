"use client";
import React from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function Textarea({ className = "", ...props }: Props) {
  return (
    <textarea
      className={`w-full min-h-[120px] rounded-lg border border-white/10 bg-[#07090d] px-3 py-2 text-sm text-white outline-none placeholder:text-white/34 focus:border-cyan-200/50 ${className}`}
      {...props}
    />
  );
}
