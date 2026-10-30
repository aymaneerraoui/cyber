import type { Metadata } from 'next'
import { ApplicationStudio } from '@/components/dashboard/application-studio'

export const metadata: Metadata = {
  title: 'Application Studio | CYBER'
}

export default async function ApplicationsPage({
  params
}: {
  params: Promise<{ serverId: string }>
}) {
  const { serverId } = await params

  return <ApplicationStudio serverId={serverId} />
}
