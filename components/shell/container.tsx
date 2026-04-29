import { cn } from "@/lib/utils";

export function Container({
  className,
  width = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { width?: "default" | "narrow" }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6",
        width === "narrow" ? "max-w-[720px]" : "max-w-[1200px]",
        className
      )}
      {...props}
    />
  );
}
