import { ReactionRolesStudio } from '@/components/dashboard/reaction-roles-studio'

export default async function ReactionRolesPage({ params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params
  return <ReactionRolesStudio serverId={serverId} />
}
