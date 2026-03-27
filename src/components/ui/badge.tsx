import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[2px] border px-2 py-[3px] text-[11px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#F5F5F5] text-[#777]",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-[#EAF7EF] text-[#27AE60]",
        warning: "border-transparent bg-[#FEF9E7] text-[#F39C12]",
        danger: "border-transparent bg-[#FDEDEC] text-[#E74C3C]",
        info: "border-transparent bg-[#EAF2F8] text-[#2980B9]",
        amber: "border-transparent bg-[#FFF5F3] text-[#BE3A21]",
        green: "border-transparent bg-[#EAF7EF] text-[#27AE60]",
        red: "border-transparent bg-[#FDEDEC] text-[#E74C3C]",
        blue: "border-transparent bg-[#EAF2F8] text-[#2980B9]",
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
