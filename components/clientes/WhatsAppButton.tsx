'use client'

import { MessageCircle } from 'lucide-react'
import { cn, whatsappLink } from '@/lib/utils'

/**
 * One-click WhatsApp. Opens wa.me with the client's number (RD country code
 * added automatically) and an optional prefilled message. Real and functional
 * from day one. Renders disabled if there's no usable number.
 */
export function WhatsAppButton({
  phone,
  message,
  label = 'WhatsApp',
  size = 'md',
  className,
}: {
  phone?: string | null
  message?: string
  label?: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const href = whatsappLink(phone, message)
  const sizes = size === 'sm' ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-sm'

  if (!href) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border border-border font-medium text-muted-foreground opacity-50',
          sizes,
          className,
        )}
        title="Sin número de WhatsApp"
      >
        <MessageCircle className="h-4 w-4" />
        {label}
      </span>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-2 rounded-xl font-semibold text-white transition-transform',
        'bg-[#25D366] shadow-[0_4px_16px_-6px_rgba(37,211,102,0.6)] hover:-translate-y-0.5 hover:brightness-105',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        sizes,
        className,
      )}
    >
      <MessageCircle className="h-4 w-4" />
      {label}
    </a>
  )
}
