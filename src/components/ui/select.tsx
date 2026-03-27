import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-[10px] border-[0.5px] border-[#E7E5E4] bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:border-[#c75b12] focus-visible:shadow-[0_0_0_3px_rgba(239,159,39,0.15)] disabled:cursor-not-allowed disabled:opacity-50",
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
