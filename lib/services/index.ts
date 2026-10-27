import { demoService } from './demo-service'
import { createHttpService } from './http-service'
import type { CyberService } from './types'

const apiUrl = process.env.NEXT_PUBLIC_CYBER_API_URL

export const cyberService: CyberService = apiUrl ? createHttpService(apiUrl) : demoService

export const isDemoMode = cyberService.mode === 'demo'

export { DEMO_SERVER_ID } from './demo-seed'
export type * from './types'
