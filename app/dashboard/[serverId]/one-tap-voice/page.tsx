import { OneTapVoicePremium } from '@/components/dashboard/one-tap-voice-premium'
export default async function Page({params}:{params:Promise<{serverId:string}>}) {
 const {serverId}=await params
 return <OneTapVoicePremium serverId={serverId}/>
}
