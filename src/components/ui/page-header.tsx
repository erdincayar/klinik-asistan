import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  action?: React.ReactNode
}

function PageHeader({ title, description, action, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)} {...props}>
      <div>
        <h1 className="text-xl font-bold uppercase tracking-wider text-[#333]">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-[#777]">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export { PageHeader }
