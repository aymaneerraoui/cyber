import {WhitelistPremiumStudio} from '@/components/dashboard/whitelist-premium-studio'
export default async function Page({params}:{params:Promise<{serverId:string}>}){const {serverId}=await params;return <WhitelistPremiumStudio serverId={serverId}/>}
