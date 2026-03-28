import * as React from "react"
import { cn } from "@/lib/utils"

interface SectionDividerProps extends React.HTMLAttributes<HTMLDivElement> {}

function SectionDivider({ className, ...props }: SectionDividerProps) {
  return (
    <div className={cn("relative flex items-center py-6", className)} {...props}>
      <div className="flex-1 border-t border-[#E5E7EB]" />
      <div className="mx-4 h-3 w-3 rounded-full border-2 border-[#E5E7EB] bg-white" />
      <div className="flex-1 border-t border-[#E5E7EB]" />
    </div>
  )
}

export { SectionDivider }
