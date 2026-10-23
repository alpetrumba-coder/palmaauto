/** Owner-only short dictation. Speech credentials stay on the customer server. */
type Options=Readonly<{getSession:()=>Promise<Readonly<{role:string;staffId:string}>|null>;
  apiKey?:()=>string|undefined;fetch?:typeof fetch;bodyTimeoutMs?:number;providerTimeoutMs?:number;now?:()=>number}>;
const ORIGIN='https://palmaauto.ru';
const PATH='/admin-panel/ai-editor/voice';
const TARGET='https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?lang=ru-RU&topic=general&format=lpcm&sampleRateHertz=16000';
const HEADERS={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',
  'content-security-policy':"default-src 'none'; frame-ancestors 'none'"};
class VoiceError extends Error {readonly status:number;constructor(status:number){super('Voice unavailable');this.status=status;}}
function fail(status:number):never{throw new VoiceError(status);}
function reply(status:number,value:unknown){return Response.json(value,{status,headers:HEADERS});}
async function bounded(stream:ReadableStream<Uint8Array>|null,limit:number,timeout:number,signal?:AbortSignal):Promise<Buffer>{
  if(!stream||signal?.aborted)fail(408);
  const reader=stream.getReader();let timer:ReturnType<typeof setTimeout>|undefined;let abort:(()=>void)|undefined;
  try{
    const reading=(async()=>{const chunks:Uint8Array[]=[];let count=0;
      while(true){const part=await reader.read();if(part.done)return Buffer.concat(chunks,count);
        count+=part.value.byteLength;if(count>limit)fail(413);chunks.push(part.value);}})();
    const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new VoiceError(408)),timeout);
      abort=()=>reject(new VoiceError(408));signal?.addEventListener('abort',abort,{once:true});});
    return await Promise.race([reading,deadline]);
  }finally{clearTimeout(timer);if(abort)signal?.removeEventListener('abort',abort);void reader.cancel().catch(()=>{});}
}

export function createFactoryVoiceHandler(options:Options){
  const rates=new Map<string,Readonly<{expires:number;count:number}>>();let active=0;
  return async(request:Request):Promise<Response>=>{
    let entered=false;
    try{
      const url=new URL(request.url);
      if(url.origin!==ORIGIN||url.pathname!==PATH||url.search||url.hash)fail(404);
      if(!['GET','POST'].includes(request.method))fail(405);
      const session=await options.getSession();if(!session)fail(401);
      if(session.role!=='OWNER'||!session.staffId||session.staffId.length>128)fail(403);
      const key=(options.apiKey?options.apiKey():process.env.YANDEX_SPEECHKIT_API_KEY)?.trim();
      const enabled=!!key&&key.length<=4096;
      if(request.method==='GET')return reply(200,{enabled,maxSeconds:30});
      if(request.headers.get('origin')!==ORIGIN||request.headers.get('content-type')!=='audio/pcm'
        ||request.headers.get('x-factory-voice')!=='1')fail(403);
      if(!enabled)fail(503);
      const now=(options.now??Date.now)();
      for(const [id,rate]of rates)if(rate.expires<=now)rates.delete(id);
      const rate=rates.get(session.staffId);
      if(active>=2||(rate?.count??0)>=12||(!rate&&rates.size>=256))fail(429);
      rates.set(session.staffId,{expires:rate?.expires??now+60000,count:(rate?.count??0)+1});active++;entered=true;
      const length=request.headers.get('content-length');
      if(length!==null&&(!/^\d{1,7}$/.test(length)||Number(length)>960000))fail(413);
      const audio=await bounded(request.body,960000,options.bodyTimeoutMs??5000,request.signal);
      if(audio.length===0||audio.length%2!==0||(length!==null&&audio.length!==Number(length)))fail(413);
      const control=new AbortController();const timeout=setTimeout(()=>control.abort(),options.providerTimeoutMs??25000);
      try{
        const response=await (options.fetch??fetch)(TARGET,{method:'POST',redirect:'error',signal:control.signal,
          headers:{Authorization:`Api-Key ${key}`,'Content-Type':'application/octet-stream'},body:new Uint8Array(audio)});
        if(!response.ok){void response.body?.cancel().catch(()=>{});fail(502);}
        const raw=await bounded(response.body,65536,25000,control.signal);
        const value:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
        if(!value||typeof value!=='object'||Array.isArray(value))fail(502);
        const text=(value as Record<string,unknown>).result;
        if(typeof text!=='string'||text.length>20000||!text.isWellFormed())fail(502);
        if(!text.trim())fail(422);
        return reply(200,{text:text.trim()});
      }catch(error){if(error instanceof VoiceError&&error.status===422)throw error;fail(502);}
      finally{clearTimeout(timeout);control.abort();}
    }catch(error){const status=error instanceof VoiceError?error.status:503;
      return reply(status,{error:status===422?'Не удалось разобрать речь. Повторите или введите текст.':
        status===429?'Слишком много голосовых запросов. Повторите через минуту.':
        status===503?'Распознавание голоса пока недоступно. Введите текст.':'Не удалось распознать запись. Повторите или введите текст.'});
    }finally{if(entered)active--;}
  };
}
