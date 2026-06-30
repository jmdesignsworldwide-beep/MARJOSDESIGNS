import {
  LayoutDashboard,
  ClipboardList,
  Calculator,
  Users,
  Package,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  /** Placeholder items aren't wired up yet (Tanda 1A is visual only). */
  disabled?: boolean
}

/** Placeholder navigation — visuals only for now, no routes wired. */
export const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '#', disabled: true },
  { label: 'Órdenes', icon: ClipboardList, href: '#', disabled: true },
  { label: 'Cotizador', icon: Calculator, href: '#', disabled: true },
  { label: 'Clientes', icon: Users, href: '#', disabled: true },
  { label: 'Inventario', icon: Package, href: '#', disabled: true },
  { label: 'Reportes', icon: BarChart3, href: '#', disabled: true },
  { label: 'Ajustes', icon: Settings, href: '#', disabled: true },
]
