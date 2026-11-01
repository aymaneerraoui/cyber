import type { Metadata } from 'next'
import { WelcomeStudio } from '@/components/dashboard/welcome-studio'
export const metadata: Metadata = { title: 'Welcome Studio | CYBER' }
export default async function WelcomePage({ params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params
  return <WelcomeStudio serverId={serverId} />
}
