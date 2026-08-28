import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-white",
        secondary: "bg-secondary text-white",
        outline: "border border-border text-foreground bg-transparent",
        success: "bg-success-light text-success",
        warning: "bg-warning-light text-warning",
        error: "bg-error-light text-error",
        info: "bg-info-light text-info",
        muted: "bg-muted text-muted-foreground",
        // Soft variants
        "soft-primary": "bg-primary-light text-primary",
        "soft-secondary": "bg-secondary-light text-secondary",
        // Dark
        dark: "bg-gray-900 text-white",
      },
      size: {
        default: "px-2.5 py-1 text-xs rounded-full",
        sm: "px-2 py-0.5 text-[10px] rounded-full",
        lg: "px-3 py-1.5 text-sm rounded-full",
        // Pill style
        pill: "px-3 py-1 text-xs rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
