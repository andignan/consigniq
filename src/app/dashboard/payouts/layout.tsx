import { requireFeature } from '@/lib/tier-guard'

export default async function PayoutsLayout({ children }: { children: React.ReactNode }) {
  await requireFeature('payouts')
  return <>{children}</>
}
