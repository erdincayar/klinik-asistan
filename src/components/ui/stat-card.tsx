import * as React from "react"
import { cn } from "@/lib/utils"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: { value: string; positive?: boolean }
  color?: string
}

function StatCard({ label, value, icon, trend, color = "#6366F1", className, ...props }: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-craft",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#6C7293]">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[#1A1A2E]">{value}</p>
          {trend && (
            <p className={cn("mt-1 text-xs font-medium", trend.positive ? "text-[#059669]" : "text-[#DC2626]")}>
              {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export { StatCard }
