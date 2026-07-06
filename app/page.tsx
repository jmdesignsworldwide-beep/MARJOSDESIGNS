import { redirect } from 'next/navigation'

/**
 * Entry point. Authenticated users land on the dashboard; everyone else is
 * bounced to /login by the middleware before reaching here.
 */
export default function HomePage() {
  redirect('/dashboard')
}
