import { WebhookPremiumStudio } from '@/components/dashboard/webhook-premium-studio';
export default async function Page({params}:{params:Promise<{serverId:string}>}){const {serverId}=await params;return <WebhookPremiumStudio serverId={serverId}/>}
