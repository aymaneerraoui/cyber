
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

  // Keep the original V10 Application Studio available.
  if (version === 'v10') {
    return <ApplicationStudio serverId={serverId} />
  }

  // New V11 Multi-Application Studio Manager.
  return <MultiApplicationManager serverId={serverId} />
}
