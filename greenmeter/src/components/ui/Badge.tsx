"use client"

import { forwardRef } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center text-[10px] font-semibold px-[7px] py-0.5 rounded whitespace-nowrap",
  {
    variants: {
      variant: {
        success: "bg-[var(--grnbg)] text-[var(--grntx)]",
        warning: "bg-[var(--ambbg)] text-[var(--ambtx)]",
        error: "bg-[var(--redbg)] text-[var(--redtx)]",
        info: "bg-[var(--indbg)] text-[var(--indtx)]",
        teal: "bg-[var(--t50)] text-[var(--t700)]",
        environment: "bg-[var(--t50)] text-[var(--t800)]",
        social: "bg-[var(--indbg)] text-[var(--indtx)]",
        governance: "bg-[var(--ambbg)] text-[var(--ambtx)]",
        neutral: "bg-[var(--bg)] text-[var(--tx2)]",
        dark: "bg-[var(--t900)] text-[var(--t200)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant, className }))} {...props} />
  )
)
Badge.displayName = "Badge"

export { Badge, badgeVariants, type BadgeProps }
