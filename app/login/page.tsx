import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, FlaskConical, KeyRound, ShieldCheck } from 'lucide-react'
import { CyberEmblem } from '@/components/brand/cyber-logo'
import { HudFrame } from '@/components/cyber/hud'
import { DigitalRain } from '@/components/landing/digital-rain'
import { AnimatedText } from '@/components/motion/animated-text'
import { buttonVariants } from '@/components/ui/button'
import { getIntegrationStatus } from '@/lib/integration-status'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Sign in' }

const NOTICES: Record<string, string> = {
  'oauth-unconfigured': 'Discord sign-in is not configured yet. Add DISCORD_CLIENT_ID and DISCORD_REDIRECT_URI to enable it.',
  'invite-unconfigured': 'The bot invite link is not configured yet. Add DISCORD_CLIENT_ID to enable it.',
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams
  const status = getIntegrationStatus()
  const message = notice ? NOTICES[notice] : undefined

  return (
    <main className="relative isolate grid min-h-svh place-items-center overflow-hidden px-4 py-16">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <DigitalRain className="opacity-40" density={0.7} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#050505_80%)]" />
      </div>

      <Link href="/" className="absolute left-5 top-5 flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> BACK
      </Link>

      <HudFrame className="w-full max-w-md rounded-xl border border-border bg-background/85 p-8 backdrop-blur-xl">
        <div className="flex flex-col items-center gap-6 text-center">
          <CyberEmblem size={140} interactive={false} delay={0} />
          <div className="flex flex-col gap-2">
            <AnimatedText as="h1" text="AUTHENTICATE" preset="pageTitle" className="font-mono text-2xl font-bold tracking-[0.3em]" />
            <p className="text-sm text-muted-foreground">Sign in with the Discord account that manages your server.</p>
          </div>

          {message && (
            <div role="status" className="flex w-full items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 p-3 text-left text-xs text-warning">
              <AlertTriangle className="mt-px size-4 shrink-0" />
              {message}
            </div>
          )}

          <div className="flex w-full flex-col gap-3">
            <a href="/api/auth/discord" className={cn(buttonVariants(), 'h-11 gap-2.5 font-semibold')}>
              <KeyRound /> Continue with Discord
            </a>
            {!status.discordOAuth && <p className="text-xs text-muted-foreground">Discord OAuth2 credentials are not configured in this environment.</p>}
            <div className="flex items-center gap-3 py-1 text-[0.65rem] tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> OR <span className="h-px flex-1 bg-border" />
            </div>
            <Link href="/dashboard/demo" className={cn(buttonVariants({ variant: 'outline' }), 'h-11 gap-2.5')}>
              <FlaskConical /> Explore the demo workspace
            </Link>
          </div>

          <p className="flex items-center gap-2 text-[0.7rem] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" /> CYBER requests only the identify and guilds scopes.
          </p>
        </div>
      </HudFrame>
    </main>
  )
}
