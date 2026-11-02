import MusicStudio from '@/app/dashboard/music-studio/page'
export default async function Page({params}:{params:Promise<{serverId:string}>}){const {serverId}=await params;return <MusicStudio serverId={serverId}/>;}
