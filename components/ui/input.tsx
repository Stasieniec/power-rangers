import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "border-ink-3 bg-ink-3/40 text-text placeholder:text-text-dim focus-visible:ring-cyan/60 h-12 w-full rounded-sm border px-4 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
