import { requireAuth } from '@/lib/auth/guards'
import { AppShell } from '@/components/layout/AppShell'

/**
 * Server-enforced gate for every page in this group. requireAuth redirects
 * unauthenticated or inactive users to /login before any child renders, and
 * hands the verified profile down to the shell so the nav matches the role.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await requireAuth()
  return <AppShell profile={profile}>{children}</AppShell>
}
