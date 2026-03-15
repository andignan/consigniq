import { requireFeature } from '@/lib/tier-guard'

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  await requireFeature('reports')
  return <>{children}</>
}
