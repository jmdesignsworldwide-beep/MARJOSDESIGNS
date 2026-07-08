'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calculator, Tags, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/cotizador', label: 'Calculadora', icon: Calculator, exact: true },
  { href: '/cotizador/precios', label: 'Precios', icon: Tags },
  { href: '/cotizador/historial', label: 'Historial', icon: ScrollText },
]

export function CotizadorTabs() {
  const pathname = usePathname()
  return (
    <div className="mb-6 inline-flex rounded-xl border border-border p-1">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href)
        const Icon = t.icon
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-gold-gradient-soft text-gold-brand'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
