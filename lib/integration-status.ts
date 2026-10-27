export interface IntegrationStatus {
  discordOAuth: boolean
  botInvite: boolean
  backendApi: boolean
}

/** Reports which integrations are configured. Only booleans leave the server. */
export function getIntegrationStatus(): IntegrationStatus {
  return {
    discordOAuth: Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_REDIRECT_URI),
    botInvite: Boolean(process.env.DISCORD_CLIENT_ID),
    backendApi: Boolean(process.env.NEXT_PUBLIC_CYBER_API_URL),
  }
}
