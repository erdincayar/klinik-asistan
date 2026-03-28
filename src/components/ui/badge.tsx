import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#F3F4F6] text-[#6C7293]",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-[#ECFDF5] text-[#059669]",
        warning: "border-transparent bg-[#FFFBEB] text-[#D97706]",
        danger: "border-transparent bg-[#FEF2F2] text-[#DC2626]",
        info: "border-transparent bg-[#EFF6FF] text-[#2563EB]",
        amber: "border-transparent bg-[#EEF2FF] text-[#6366F1]",
        green: "border-transparent bg-[#ECFDF5] text-[#059669]",
        red: "border-transparent bg-[#FEF2F2] text-[#DC2626]",
        blue: "border-transparent bg-[#EFF6FF] text-[#2563EB]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
