import * as React from "react"
import { cn } from "@/lib/utils"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: { value: string; positive?: boolean }
  color?: string
}

function StatCard({ label, value, icon, trend, color = "#BE3A21", className, ...props }: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[4px] border border-[#E8E8E8] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        className
      )}
      style={{ borderLeftWidth: "4px", borderLeftColor: color }}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#777]">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[#333]">{value}</p>
          {trend && (
            <p className={cn("mt-1 text-xs font-medium", trend.positive ? "text-[#27AE60]" : "text-[#E74C3C]")}>
              {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5] text-[#777]">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export { StatCard }
