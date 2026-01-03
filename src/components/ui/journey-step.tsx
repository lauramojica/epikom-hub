import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, LucideIcon } from "lucide-react"

interface JourneyStepProps {
  name: string
  status: 'completed' | 'active' | 'pending'
  icon: LucideIcon
  className?: string
}

export function JourneyStep({ name, status, icon: Icon, className }: JourneyStepProps) {
  const isCompleted = status === 'completed'
  const isActive = status === 'active'
  
  return (
    <div className={cn("flex flex-col items-center relative", className)} style={{ flex: 1 }}>
      {/* Step Circle */}
      <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300",
        isCompleted && "bg-primary text-white shadow-[0_8px_24px_rgba(16,185,129,0.3)]",
        isActive && "bg-secondary text-white shadow-[0_8px_24px_rgba(139,92,246,0.3)] animate-pulse",
        !isCompleted && !isActive && "bg-muted text-muted-foreground"
      )}>
        {isCompleted ? (
          <Check className="w-6 h-6" />
        ) : (
          <Icon className="w-6 h-6" />
        )}
      </div>
      
      {/* Step Label */}
      <span className={cn(
        "mt-3 text-sm font-medium transition-colors",
        (isCompleted || isActive) ? "text-foreground" : "text-muted-foreground"
      )}>
        {name}
      </span>
      
      {/* Status indicator */}
      {isActive && (
        <span className="mt-1 text-xs text-secondary font-medium">En progreso</span>
      )}
    </div>
  )
}

interface JourneyFlowProps {
  children: React.ReactNode
  className?: string
}

export function JourneyFlow({ children, className }: JourneyFlowProps) {
  return (
    <div className={cn("flex items-start justify-between relative", className)}>
      {/* Connection Line - SVG curved path */}
      <div className="absolute top-8 left-12 right-12 pointer-events-none">
        <svg className="w-full h-8 -mt-4" preserveAspectRatio="none" viewBox="0 0 100 16">
          <path
            d="M0,8 Q25,0 50,8 T100,8"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="0.5"
            strokeDasharray="2,2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      {children}
    </div>
  )
}

export { JourneyStep as default }
