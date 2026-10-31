
import type { Metadata } from 'next'
import { ApplicationStudio } from '@/components/dashboard/application-studio'
import { MultiApplicationManager } from '@/components/dashboard/multi-application-manager'

export const metadata: Metadata = {
  title: 'Application Studio | CYBER'
}

export default async function ApplicationsPage({
  params,
  searchParams
}: {
  params: Promise<{ serverId: string }>
  searchParams: Promise<{ version?: string }>
}) {
  const { serverId } = await params
  const { version } = await searchParams

  // Keep the old V11 Draft Manager accessible if needed.
  if (version === 'draft') {
    return <MultiApplicationManager serverId={serverId} />
  }

  // Main Application Studio with Neon persistence.
  return <ApplicationStudio serverId={serverId} />
}
