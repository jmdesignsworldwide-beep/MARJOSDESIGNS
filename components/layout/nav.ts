import {
  LayoutDashboard,
  ClipboardList,
  Calculator,
  Users,
  Package,
  BarChart3,
  Settings,
  CalendarDays,
  UserCog,
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
  { label: 'Órdenes', icon: ClipboardList, href: '/ordenes', roles: ['super_admin'], placeholder: true },
  { label: 'Cotizador', icon: Calculator, href: '/cotizador', roles: ['super_admin'], placeholder: true },
  { label: 'Clientes', icon: Users, href: '/clientes', roles: ['super_admin'], placeholder: true },
  { label: 'Inventario', icon: Package, href: '/inventario', roles: ['super_admin'], placeholder: true },
  { label: 'Reportes', icon: BarChart3, href: '/reportes', roles: ['super_admin'], placeholder: true },
  { label: 'Usuarios', icon: UserCog, href: '/usuarios', roles: ['super_admin'] },
  { label: 'Ajustes', icon: Settings, href: '/ajustes', roles: ['super_admin'], placeholder: true },
]

/** Items visible to a role. With no role (design showcase) show everything. */
export function navFor(role?: UserRole): NavItem[] {
  if (!role) return navItems
  return navItems.filter((item) => item.roles.includes(role))
}
