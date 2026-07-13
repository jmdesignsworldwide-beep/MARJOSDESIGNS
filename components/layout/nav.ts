import {
  LayoutDashboard,
  ClipboardList,
  Calculator,
  Users,
  Package,
  Settings,
  CalendarDays,
  UserCog,
  Wallet,
  ShoppingCart,
  ReceiptText,
  LineChart,
  Truck,
  BadgeDollarSign,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/lib/auth/guards'

export interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  roles: UserRole[]
  /** Modules are still placeholders in this tanda (access is what's real). */
  placeholder?: boolean
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['super_admin', 'empleado'] },

  // Employee view — simplified
  { label: 'Mis Órdenes', icon: ClipboardList, href: '/mis-ordenes', roles: ['empleado'], placeholder: true },
  { label: 'Mi Calendario', icon: CalendarDays, href: '/mi-calendario', roles: ['empleado'], placeholder: true },

  // Admin-only
  { label: 'Calendario', icon: CalendarDays, href: '/calendario', roles: ['super_admin'] },
  { label: 'Caja', icon: Wallet, href: '/caja', roles: ['super_admin'] },
  { label: 'Venta rápida', icon: ShoppingCart, href: '/pos', roles: ['super_admin'] },
  { label: 'Gastos', icon: ReceiptText, href: '/gastos', roles: ['super_admin'] },
  { label: 'Finanzas', icon: LineChart, href: '/finanzas', roles: ['super_admin'] },
  { label: 'Nómina', icon: BadgeDollarSign, href: '/nominas', roles: ['super_admin'] },
  { label: 'Órdenes', icon: ClipboardList, href: '/ordenes', roles: ['super_admin'], placeholder: true },
  { label: 'Cotizador', icon: Calculator, href: '/cotizador', roles: ['super_admin'], placeholder: true },
  { label: 'Clientes', icon: Users, href: '/clientes', roles: ['super_admin'], placeholder: true },
  { label: 'Proveedores', icon: Truck, href: '/proveedores', roles: ['super_admin'] },
  { label: 'Inventario', icon: Package, href: '/inventario', roles: ['super_admin'] },
  { label: 'Usuarios', icon: UserCog, href: '/usuarios', roles: ['super_admin'] },
  { label: 'Ajustes', icon: Settings, href: '/ajustes', roles: ['super_admin'], placeholder: true },
]

/** Items visible to a role. With no role (design showcase) show everything. */
export function navFor(role?: UserRole): NavItem[] {
  if (!role) return navItems
  return navItems.filter((item) => item.roles.includes(role))
}
