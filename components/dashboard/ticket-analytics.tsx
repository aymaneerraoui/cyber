'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Crown, Medal, Trophy, RefreshCw, ScrollText, Ticket, UserRound, Clock3 } from 'lucide-react'

type Staff = { staffId: string; ticketsHandled: number; lastCompletedAt: string | null; rank: number }
type Log = { eventId: string; ticketId: string; panelId: string; ownerId: string; actorId: string; type: string; claimedById: string | null; occurredAt: string }
type Analytics = {
  ok: boolean
  leaderboard: Staff[]
  logs: Log[]
  summary: { totalCreated: number; totalClosed: number; totalDeleted: number; staffWhoClaimed: number }
}

const GOLD = '#eabf46'
const dateLabel = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString()
}
const defaultAvatar = (id: string) => {
  try { return `https://cdn.discordapp.com/embed/avatars/${(Number(id.slice(-6)) % 6)}.png` }
  catch { return 'https://cdn.discordapp.com/embed/avatars/0.png' }
}
const eventLabel: Record<string, string> = {
  created: 'Created', claimed: 'Claimed', unclaimed: 'Unclaimed', closed: 'Closed', deleted: 'Deleted'
}

function PodiumMember({ staff, place }: { staff?: Staff; place: 1 | 2 | 3 }) {
  const reduced = useReducedMotion()
  const first = place === 1
  const height = first ? 'h-32 sm:h-40' : place === 2 ? 'h-24 sm:h-28' : 'h-20 sm:h-24'
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: place === 2 ? 0.1 : place === 1 ? 0.25 : 0.4 }}
      className="flex min-w-0 flex-col items-center justify-end gap-2"
    >
      <motion.div animate={reduced ? undefined : { y: [0, -7, 0] }} transition={{ duration: 3.7 + place * 0.4, repeat: Infinity, ease: 'easeInOut' }} className="flex w-full flex-col items-center gap-2">
        {first ? <Crown className="size-6 text-[#eabf46] drop-shadow-[0_0_12px_rgba(234,191,70,0.75)]" /> : <Medal className="size-5 text-[#c9b991]" />}
        <div className={`relative rounded-full border-2 ${first ? 'border-[#eabf46] p-1 shadow-[0_0_30px_rgba(234,191,70,0.4)]' : 'border-[#9b8144] p-0.5'}`}>
          {staff ? (
            <img src={defaultAvatar(staff.staffId)} alt={`Staff rank ${place} default Discord avatar`} className={`${first ? 'size-16 sm:size-20' : 'size-12 sm:size-16'} rounded-full bg-[#242327]`} />
          ) : <div className={`${first ? 'size-16 sm:size-20' : 'size-12 sm:size-16'} grid place-items-center rounded-full bg-[#242327]`}><UserRound className="size-6 text-[#8c8c92]" /></div>}
          <span className="absolute -bottom-1 -right-2 min-w-7 rounded-full border-2 border-[#111115] bg-[#eabf46] px-1.5 py-0.5 text-center text-[11px] font-black text-black">{staff?.ticketsHandled ?? 0}</span>
        </div>
        <p className="max-w-full truncate px-1 text-center text-xs font-bold text-white">{staff ? `Staff ${staff.staffId.slice(-6)}` : 'Unranked'}</p>
        <p className="max-w-full truncate px-1 text-center text-[10px] text-[#8d8c93]" title={staff?.staffId}>{staff?.staffId ?? 'No staff yet'}</p>
      </motion.div>
      <div className={`flex w-full items-center justify-center rounded-t-xl border border-[#eabf46]/30 bg-gradient-to-b from-[#eabf46]/20 to-[#171619] ${height} ${first ? 'shadow-[0_0_35px_rgba(234,191,70,0.12)]' : ''}`}>
        <span className={`${first ? 'text-5xl' : 'text-4xl'} font-black text-[#eabf46]`}>{place}</span>
      </div>
    </motion.div>
  )
}

export function TicketAnalytics({ serverId }: { serverId: string }) {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/servers/${encodeURIComponent(serverId)}/tickets/analytics`, {
          credentials: 'include', cache: 'no-store', signal: controller.signal
        })
        const json: unknown = await response.json()
        if (!response.ok) throw new Error((json as { error?: string })?.error || `HTTP ${response.status}`)
        const result = json as Analytics
        if (!Array.isArray(result.leaderboard) || !Array.isArray(result.logs)) throw new Error('Invalid analytics response')
        if (!controller.signal.aborted) setData(result)
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load analytics')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [serverId, refresh])

  const staff = data?.leaderboard ?? []
  const logs = data?.logs ?? []
  return (
    <div className="space-y-6">
      <motion.section initial={reduced ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-[#eabf46]/30 bg-[#101014] p-5 text-white sm:p-7">
        <motion.div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full border border-[#eabf46]/20" animate={reduced ? undefined : { rotate: 360 }} transition={{ duration: 45, repeat: Infinity, ease: 'linear' }} />
        <div className="relative mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
