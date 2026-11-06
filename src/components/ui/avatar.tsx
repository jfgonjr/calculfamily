"use client";

import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Avatar({
  name,
  color,
  size = "md",
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "h-7 w-7 text-[11px]", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-xl" };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        sizes[size]
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
