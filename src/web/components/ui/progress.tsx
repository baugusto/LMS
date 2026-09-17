import * as React from "react";
import { cn } from "@/web/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  showGlow?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, showGlow = false, ...props }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value));
    const isComplete = clampedValue >= 100;
    
    return (
      <div
        ref={ref}
        className={cn(
          "h-2 w-full overflow-hidden rounded-full bg-blue-500/20",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            isComplete 
              ? "bg-gradient-to-r from-green-500 to-green-400" 
              : "bg-gradient-to-r from-blue-500 to-blue-400",
            showGlow && (isComplete ? "shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "shadow-[0_0_10px_rgba(59,130,246,0.5)]")
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
