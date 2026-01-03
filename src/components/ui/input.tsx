import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'filled' | 'ghost'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = 'default', ...props }, ref) => {
    const variants = {
      default: "border-2 border-border bg-background-card focus:border-primary focus:ring-2 focus:ring-primary/20",
      filled: "border-0 bg-muted focus:bg-background-card focus:ring-2 focus:ring-primary/20",
      ghost: "border-0 bg-transparent hover:bg-muted focus:bg-muted focus:ring-0",
    }
    
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl px-4 py-2.5 text-sm transition-all duration-200",
          "placeholder:text-muted-foreground",
          "focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          variants[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
