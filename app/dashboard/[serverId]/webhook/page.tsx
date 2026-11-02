import { CyberModuleStudio } from '@/components/dashboard/cyber-module-studio'
export default async function Page({params}:{params:Promise<{serverId:string}>}){const {serverId}=await params;return <CyberModuleStudio serverId={serverId} moduleId="webhook"/>}
