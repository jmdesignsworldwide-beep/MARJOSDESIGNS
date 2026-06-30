'use client'

import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const fieldBase =
  'w-full rounded-xl border bg-input/5 px-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 ' +
  'transition-colors duration-150 outline-none ' +
  'focus:border-gold-mid focus:ring-2 focus:ring-gold-mid/30 ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

function errorRing(error?: boolean) {
  return error
    ? 'border-status-overdue focus:border-status-overdue focus:ring-status-overdue/30'
    : 'border-border'
}

/** Shared label + error + hint wrapper. */
export function FieldShell({
  label,
  error,
  hint,
  htmlFor,
  children,
  className,
}: {
  label?: string
  error?: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-status-overdue">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => (
    <FieldShell label={label} error={error} hint={hint} htmlFor={id}>
      <input
        ref={ref}
        id={id}
        className={cn(fieldBase, 'h-11', errorRing(!!error), className)}
        {...props}
      />
    </FieldShell>
  ),
)
Input.displayName = 'Input'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => (
    <FieldShell label={label} error={error} hint={hint} htmlFor={id}>
      <textarea
        ref={ref}
        id={id}
        className={cn(fieldBase, 'min-h-[96px] py-2.5', errorRing(!!error), className)}
        {...props}
      />
    </FieldShell>
  ),
)
Textarea.displayName = 'Textarea'

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className, id, children, ...props }, ref) => (
    <FieldShell label={label} error={error} hint={hint} htmlFor={id}>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          className={cn(
            fieldBase,
            'h-11 appearance-none pr-10',
            errorRing(!!error),
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </FieldShell>
  ),
)
Select.displayName = 'Select'
