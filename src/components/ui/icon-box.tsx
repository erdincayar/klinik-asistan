import * as React from "react"
import { cn } from "@/lib/utils"

interface IconBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
  active?: boolean
}

const sizeMap = {
  sm: "h-[36px] w-[36px]",
  md: "h-[44px] w-[44px]",
  lg: "h-[64px] w-[64px]",
}

function IconBox({ className, size = "md", active = false, children, ...props }: IconBoxProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-colors",
        sizeMap[size],
        active ? "bg-[#BE3A21] text-white" : "bg-[#EEE] text-[#555]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { IconBox }
