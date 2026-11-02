import DutyStudio from '@/components/dashboard/duty-studio';
export default async function Page({params}:{params:Promise<{serverId:string}>}){const {serverId}=await params;return <DutyStudio serverId={serverId}/>}
