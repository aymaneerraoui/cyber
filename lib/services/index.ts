import { demoService } from './demo-service'
import { createHttpService } from './http-service'
import type { CyberService } from './types'

const apiUrl = process.env.NEXT_PUBLIC_CYBER_API_URL

export const cyberService: CyberService =
  createHttpService(apiUrl || '/api')

export const isDemoMode = false

export { DEMO_SERVER_ID } from './demo-seed'
export type * from './types'
