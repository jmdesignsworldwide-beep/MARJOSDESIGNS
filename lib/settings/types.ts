/** Client-safe settings types + defaults (no server-only deps). */

export type ThemePref = 'light' | 'dark' | 'system'

export interface AppSettings {
  businessName: string
  legalName: string | null
  rnc: string | null
  address: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  instagram: string | null
  notifyDays: number[]
  overloadWarn: number
  overloadHeavy: number
  defaultTheme: ThemePref
  updatedAt: string | null
}

/** Just the business identity — what documents/PDFs print (one source). */
export interface BusinessInfo {
  name: string
  legalName: string | null
  rnc: string | null
  address: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  instagram: string | null
}

export const DEFAULT_SETTINGS: AppSettings = {
  businessName: 'Marjos Designs',
  legalName: null,
  rnc: null,
  address: null,
  phone: null,
  whatsapp: null,
  email: null,
  instagram: null,
  notifyDays: [3, 1, 0],
  overloadWarn: 5,
  overloadHeavy: 8,
  defaultTheme: 'system',
  updatedAt: null,
}

export function businessInfoFrom(s: AppSettings): BusinessInfo {
  return {
    name: s.businessName,
    legalName: s.legalName,
    rnc: s.rnc,
    address: s.address,
    phone: s.phone,
    whatsapp: s.whatsapp,
    email: s.email,
    instagram: s.instagram,
  }
}
