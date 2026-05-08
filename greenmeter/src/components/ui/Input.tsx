"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, type = "text", ...props }, ref) => (
    <div className="mb-[13px]">
      {label && (
        <label
          htmlFor={id}
          className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        type={type}
        className={cn(
          "w-full px-[11px] py-2 border border-[var(--bdr)] rounded-[7px] text-xs outline-none transition-[border-color] bg-[var(--surf)]",
          "focus:border-[var(--t500)] focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)]",
          error && "border-[var(--red)] focus:border-[var(--red)] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-[10px] text-[var(--red)] mt-1">{error}</p>
      )}
    </div>
  )
)
Input.displayName = "Input"

export { Input, type InputProps }
