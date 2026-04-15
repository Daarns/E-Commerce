"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface RadioGroupContextType {
  value?: string
  onValueChange?: (value: string) => void
  name: string
}

const RadioGroupContext = React.createContext<RadioGroupContextType | null>(null)

interface RadioGroupProps {
  value?: string
  onValueChange?: (value: unknown) => void
  className?: string
  children?: React.ReactNode
}

function RadioGroup({
  className,
  value,
  onValueChange,
  children,
}: RadioGroupProps) {
  const name = React.useId()
  
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange: (v) => onValueChange?.(v), name }}>
      <div
        role="radiogroup"
        data-slot="radio-group"
        className={cn("grid gap-3", className)}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

interface RadioGroupItemProps {
  value: string
  id?: string
  className?: string
  children?: React.ReactNode
  disabled?: boolean
}

function RadioGroupItem({
  value,
  id,
  className,
  disabled,
}: RadioGroupItemProps) {
  const context = React.useContext(RadioGroupContext)
  const isChecked = context?.value === value
  
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isChecked}
      data-slot="radio-group-item"
      data-state={isChecked ? 'checked' : 'unchecked'}
      data-checked={isChecked ? '' : undefined}
      disabled={disabled}
      id={id}
      className={cn(
        "aspect-square h-4 w-4 shrink-0 rounded-full border border-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        isChecked && "bg-primary text-primary-foreground",
        className
      )}
      onClick={() => context?.onValueChange?.(value)}
    >
      {isChecked && (
        <span className="flex items-center justify-center w-full h-full">
          <span className="h-2 w-2 rounded-full bg-primary-foreground" />
        </span>
      )}
    </button>
  )
}

export { RadioGroup, RadioGroupItem }
