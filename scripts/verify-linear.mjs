import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
for (const role of ['orchestrator','developer','qa']) {
  const child=spawn(process.execPath,[new URL('./linear-launch.mjs',import.meta.url).pathname,role],{stdio:['pipe','pipe','inherit']});
  const pending=new Map(); let id=0;
  const lines=createInterface({input:child.stdout});
  lines.on('line',line=>{const message=JSON.parse(line);pending.get(message.id)?.(message);});
  const request=(method,params={})=>new Promise((resolve,reject)=>{
    const key=++id;
    const timer=setTimeout(()=>reject(new Error(`${role}: timeout ${method}`)),55000);
    pending.set(key,result=>{clearTimeout(timer);pending.delete(key);result.error?reject(new Error('MCP request failed')):resolve(result.result);});
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:key,method,params})+'\n');
  });
  try {
    await request('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'identity-verification',version:'1'}});
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
    const list=await request('tools/list');
    const tool=list.tools.find(t=>t.name==='get_user');
    if (!tool) throw new Error('get_user tool unavailable');
    const identity=await request('tools/call',{name:tool.name,arguments:{query:'me'}});
    const actor=JSON.parse(identity.content.find(item=>item.type==='text').text);
    const expected={orchestrator:'matiasnj+orquestrator@gmail.com',developer:'matiasnj+developer@gmail.com',qa:'matiasnj+qa@gmail.com'}[role];
    if (identity.isError || actor.email !== expected) throw new Error(`${role}: identity mismatch`);
    console.log(JSON.stringify({role,toolCount:list.tools.length,email:actor.email,result:'PASS'}));
  } finally {child.stdin.end();}
}
