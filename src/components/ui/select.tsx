import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:border-[#6366F1] focus-visible:ring-2 focus-visible:ring-[#6366F1]/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

export interface SelectOptionProps extends React.OptionHTMLAttributes<HTMLOptionElement> {}

const SelectOption = React.forwardRef<HTMLOptionElement, SelectOptionProps>(
  ({ className, ...props }, ref) => {
    return <option ref={ref} className={className} {...props} />
  }
)
SelectOption.displayName = "SelectOption"

export { Select, SelectOption }
