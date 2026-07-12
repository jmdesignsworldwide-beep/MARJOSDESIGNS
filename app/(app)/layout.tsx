import { requireAuth } from '@/lib/auth/guards'
import { AppShell } from '@/components/layout/AppShell'
import { getDeliveryNotices, type DeliveryNotice } from '@/lib/notifications/data'

/**
 * Server-enforced gate for every page in this group. requireAuth redirects
 * unauthenticated or inactive users to /login before any child renders, and
 * hands the verified profile down to the shell so the nav matches the role.
 * Delivery notifications are fetched for super_admin only.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await requireAuth()
  let notices: DeliveryNotice[] = []
  if (profile.role === 'super_admin') {
    notices = await getDeliveryNotices()
  }
  return (
    <AppShell profile={profile} notices={notices}>
      {children}
    </AppShell>
  )
}
