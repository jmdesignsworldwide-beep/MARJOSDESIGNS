import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DEFAULT_SETTINGS, businessInfoFrom, type AppSettings, type BusinessInfo, type ThemePref } from './types'

/**
 * Read the singleton settings row. Falls back to sane defaults if the row is
 * missing (e.g. migration not run yet) so the app never breaks. Reading is
 * super_admin-only via RLS; for documents use getBusinessInfo which degrades to
 * the default business name when called without access.
 */
export async function getSettings(): Promise<AppSettings> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('app_settings')
    .select('business_name, legal_name, rnc, address, phone, whatsapp, email, instagram, notify_days, overload_warn, overload_heavy, default_theme, updated_at')
    .eq('id', 1)
    .maybeSingle()

  if (!data) return DEFAULT_SETTINGS

  const notify = Array.isArray(data.notify_days)
    ? (data.notify_days as number[]).map((n) => Number(n)).filter((n) => Number.isFinite(n))
    : DEFAULT_SETTINGS.notifyDays

  return {
    businessName: data.business_name ?? DEFAULT_SETTINGS.businessName,
    legalName: data.legal_name ?? null,
    rnc: data.rnc ?? null,
    address: data.address ?? null,
    phone: data.phone ?? null,
    whatsapp: data.whatsapp ?? null,
    email: data.email ?? null,
    instagram: data.instagram ?? null,
    notifyDays: notify.length ? notify : DEFAULT_SETTINGS.notifyDays,
    overloadWarn: Number(data.overload_warn) || DEFAULT_SETTINGS.overloadWarn,
    overloadHeavy: Number(data.overload_heavy) || DEFAULT_SETTINGS.overloadHeavy,
    defaultTheme: (data.default_theme as ThemePref) ?? DEFAULT_SETTINGS.defaultTheme,
    updatedAt: data.updated_at ?? null,
  }
}

/** Business identity for documents/PDFs (one source). Degrades to defaults. */
export async function getBusinessInfo(): Promise<BusinessInfo> {
  try {
    return businessInfoFrom(await getSettings())
  } catch {
    return businessInfoFrom(DEFAULT_SETTINGS)
  }
}
