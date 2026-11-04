import CyberMusicStudioV3 from '@/components/dashboard/cyber-music-studio-v3'

// Public music-only page. It is deliberately outside /dashboard so the
// AppShell sidebar and ServerGuard do not wrap it. Privileged API endpoints
// continue to enforce their own authentication and permissions.
export default async function Page({ params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params
  if (!/^\d{17,20}$/.test(serverId)) {
    return <main style={{ padding: 40 }}>Invalid Discord server ID.</main>
  }
  return <CyberMusicStudioV3 serverId={serverId} publicMode />
}
