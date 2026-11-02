import {NextResponse} from 'next/server'
import {neon} from '@neondatabase/serverless'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:Request,{params}:{params:Promise<{guildId:string}>}){
 const {guildId}=await params
 const secret=process.env.BOT_API_SECRET
 const supplied=request.headers.get('authorization')
 if(!secret||supplied!==`Bearer ${secret}`)return NextResponse.json({error:'unauthorized'},{status:401})
 if(!/^\d{17,20}$/.test(guildId))return NextResponse.json({error:'invalid_guild'},{status:400})
 if(!process.env.DATABASE_URL)return NextResponse.json({error:'database_unavailable'},{status:503})
 try{
  const sql=neon(process.env.DATABASE_URL)
  const rows=await sql`SELECT config FROM cyber_server_config WHERE guild_id=${guildId} AND resource_key='music' LIMIT 1`
  const config=rows[0]?.config||{}
  return NextResponse.json({panelImages:config.panelImages||{},panelVersion:config.panelVersion||0},{headers:{'Cache-Control':'no-store'}})
 }catch{return NextResponse.json({error:'database_unavailable'},{status:502})}
}
