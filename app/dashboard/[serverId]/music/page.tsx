import CyberMusicStudioV3 from '@/components/dashboard/cyber-music-studio-v3'
export default async function Page({params}:{params:Promise<{serverId:string}>}){
 const {serverId}=await params
 return <CyberMusicStudioV3 serverId={serverId}/>
}
