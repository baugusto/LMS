import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/web/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
        outline: "border-border text-muted-foreground hover:border-blue-500/30 hover:text-foreground",
        solid: "border-transparent bg-blue-500 text-white shadow-glow-sm",
        success: "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20",
        warning: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20",
        destructive: "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20",
        secondary: "border-border/50 bg-muted/50 text-muted-foreground hover:bg-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
