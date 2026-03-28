"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextType {
  value: string
  setValue: (value: string) => void
}

const TabsContext = React.createContext<TabsContextType>({
  value: "",
  setValue: () => {},
})

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
}

function Tabs({ defaultValue = "", value: controlledValue, onValueChange, className, children, ...props }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const value = controlledValue !== undefined ? controlledValue : internalValue
  const setValue = React.useCallback(
    (v: string) => {
      if (onValueChange) onValueChange(v)
      else setInternalValue(v)
    },
    [onValueChange]
  )

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg bg-[#F3F4F6] p-1",
        className
      )}
      {...props}
    />
  )
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

function TabsTrigger({ className, value, ...props }: TabsTriggerProps) {
  const { value: selectedValue, setValue } = React.useContext(TabsContext)
  const isActive = selectedValue === value

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-[#6C7293] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive && "bg-white text-[#1A1A2E] shadow-sm",
        className
      )}
      onClick={() => setValue(value)}
      {...props}
    />
  )
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

function TabsContent({ className, value, ...props }: TabsContentProps) {
  const { value: selectedValue } = React.useContext(TabsContext)
  if (selectedValue !== value) return null

  return (
    <div
      className={cn(
        "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
