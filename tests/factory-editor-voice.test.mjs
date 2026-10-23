import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createFactoryVoiceHandler} from '../lib/factory-editor-voice.ts';

const url='https://palmaauto.ru/admin-panel/ai-editor/voice';
const owner={role:'OWNER',staffId:'fixture-owner'};
const post=(body=Buffer.alloc(32000),headers={})=>new Request(url,{method:'POST',headers:{origin:'https://palmaauto.ru','content-type':'audio/pcm','x-factory-voice':'1',...headers},body});
const setup=(extra={})=>createFactoryVoiceHandler({getSession:async()=>owner,apiKey:()=> 'synthetic-fixture-key',fetch:async()=>Response.json({result:'Поменяй заголовок'}),...extra});

test('voice requires active OWNER and same origin explicit recording request',async()=>{
  for(const session of [null,{role:'MANAGER',staffId:'staff'}]){
    const response=await setup({getSession:async()=>session})(post());
    assert.equal(response.status,session?403:401);
  }
  for(const headers of [{origin:'https://other.invalid'},{'x-factory-voice':'0'},{'content-type':'application/json'}])
    assert.equal((await setup()(post(undefined,headers))).status,403);
});

test('voice capability exposes no credentials and does not call provider',async()=>{
  const handle=setup({fetch:async()=>assert.fail('Provider called')});
  const response=await handle(new Request(url));
  assert.deepEqual(await response.json(),{enabled:true,maxSeconds:30});
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal((await setup({apiKey:()=>undefined})(post())).status,503);
});

test('voice sends bounded mono LPCM only to fixed SpeechKit without redirect or key leakage',async()=>{
  let called;
  const response=await setup({fetch:async(target,options)=>{called={target,options};return Response.json({result:' Измени текст. '});}})(post());
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{text:'Измени текст.'});
  assert.equal(called.target,'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?lang=ru-RU&topic=general&format=lpcm&sampleRateHertz=16000');
  assert.equal(called.options.redirect,'error');
  assert.equal(called.options.headers.Authorization,'Api-Key synthetic-fixture-key');
  assert.equal(called.options.body.byteLength,32000);
});

test('voice rejects empty, partial sample, oversized and interrupted recordings',async()=>{
  for(const audio of [Buffer.alloc(0),Buffer.alloc(3),Buffer.alloc(960002)])
    assert.equal((await setup({fetch:async()=>assert.fail('Provider called')})(post(audio))).status,413);
  const aborted=new AbortController();aborted.abort();
  const request=new Request(url,{method:'POST',headers:{origin:'https://palmaauto.ru','content-type':'audio/pcm','x-factory-voice':'1'},body:Buffer.alloc(32000),signal:aborted.signal});
  assert.equal((await setup()(request)).status,408);
});

test('voice hides provider errors and bounds untrusted provider result',async()=>{
  for(const provider of [async()=>{throw new Error('private-secret');},async()=>new Response('private-secret',{status:403}),async()=>Response.json({result:'x'.repeat(20001)}),async()=>new Response('x'.repeat(65537)),async()=>Response.json({result:123})]){
    const response=await setup({fetch:provider})(post());
    assert.equal(response.status,502);assert.ok(!(await response.text()).includes('private-secret'));
  }
  assert.equal((await setup({fetch:async()=>Response.json({result:''})})(post())).status,422);
});

test('voice per-owner rate and concurrency bounds prevent repeated paid effects',async()=>{
  let finish;
  const pending=new Promise(resolve=>{finish=resolve;});
  const handle=setup({fetch:async()=>{await pending;return Response.json({result:'done'});}});
  const first=handle(post()),second=handle(post());
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal((await handle(post())).status,429);finish();await Promise.all([first,second]);
  for(let count=0;count<10;count++)assert.equal((await handle(post())).status,200);
  assert.equal((await handle(post())).status,429);
});

test('voice rejects other paths, methods and bounded body timeout',async()=>{
  assert.equal((await setup()(new Request(url+'/extra'))).status,404);
  assert.equal((await setup()(new Request(url,{method:'PUT'}))).status,405);
  const slow=new ReadableStream({start(){}});
  const request=new Request(url,{method:'POST',headers:{origin:'https://palmaauto.ru','content-type':'audio/pcm','x-factory-voice':'1'},body:slow,duplex:'half'});
  assert.equal((await setup({bodyTimeoutMs:20})(request)).status,408);
});
test('voice aborts stalled provider and request streams without retry',async()=>{
  let calls=0;
  const handle=setup({providerTimeoutMs:20,fetch:async(_,options)=>{calls++;
    return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));}});
  assert.equal((await handle(post())).status,502);assert.equal(calls,1);
  const control=new AbortController();
  const stream=new ReadableStream({start(){}});
  const request=new Request(url,{method:'POST',headers:{origin:'https://palmaauto.ru','content-type':'audio/pcm','x-factory-voice':'1'},body:stream,duplex:'half',signal:control.signal});
  const response=setup()(request);setTimeout(()=>control.abort(),20);
  assert.equal((await response).status,408);
});
test('voice cancels failed provider response streams before releasing its concurrency slot',async()=>{
  let cancelled=false,signal;
  const response=await setup({fetch:async(_,options)=>{
    signal=options.signal;return new Response(new ReadableStream({start(){},cancel(){cancelled=true;}}),{status:503});
  }})(post());
  assert.equal(response.status,502);assert.equal(cancelled,true);assert.equal(signal.aborted,true);
});

test('voice accepts the exact public host when Next exposes an internal HTTP request URL',async()=>{
  const internal='http://0.0.0.0:3000/admin-panel/ai-editor/voice';
  for(const headers of [{host:'palmaauto.ru'},{'x-forwarded-host':'palmaauto.ru'},
    {host:'0.0.0.0:3000','x-forwarded-host':'palmaauto.ru'}]){
    const capability=await setup({fetch:async()=>assert.fail('Provider called by capability')})(new Request(internal,{headers}));
    assert.equal(capability.status,200);assert.deepEqual(await capability.json(),{enabled:true,maxSeconds:30});
    let calls=0;
    const response=await setup({fetch:async()=>{calls++;return Response.json({result:'Proxy recording'});}})(new Request(internal,
      {method:'POST',headers:{...headers,origin:'https://palmaauto.ru','content-type':'audio/pcm','x-factory-voice':'1'},body:Buffer.alloc(32000)}));
    assert.equal(response.status,200);assert.deepEqual(await response.json(),{text:'Proxy recording'});assert.equal(calls,1);
  }
});

test('voice proxy host support preserves OWNER and exact public POST origin checks',async()=>{
  const internal='http://next-container:3000/admin-panel/ai-editor/voice';
  const headers={host:'next-container:3000','x-forwarded-host':'palmaauto.ru','content-type':'audio/pcm','x-factory-voice':'1'};
  for(const session of [null,{role:'MANAGER',staffId:'staff'}])
    assert.equal((await setup({getSession:async()=>session})(new Request(internal,{headers}))).status,session?403:401);
  for(const origin of [undefined,'http://palmaauto.ru','https://other.invalid','null']){
    const response=await setup({fetch:async()=>assert.fail('Provider called without exact public origin')})(new Request(internal,
      {method:'POST',headers:{...headers,...(origin?{origin}:{})},body:Buffer.alloc(32000)}));
    assert.equal(response.status,403);
  }
  for(const value of [{'x-factory-voice':'0'},{'content-type':'application/json'}])
    assert.equal((await setup({fetch:async()=>assert.fail('Provider called without explicit recording request')})(new Request(internal,
      {method:'POST',headers:{...headers,origin:'https://palmaauto.ru',...value},body:Buffer.alloc(32000)}))).status,403);
});

test('voice rejects absent, foreign, conflicting and list-valued proxy authority before session access',async()=>{
  const internal='http://0.0.0.0:3000/admin-panel/ai-editor/voice';
  const handle=setup({getSession:async()=>assert.fail('Unapproved authority reached session lookup')});
  for(const [target,headers] of [[internal,{}],[internal,{host:'0.0.0.0:3000'}],
    ['https://foreign.invalid/admin-panel/ai-editor/voice',{}],
    [internal,{host:'foreign.invalid','x-forwarded-host':'palmaauto.ru'}],
    [internal,{host:'palmaauto.ru','x-forwarded-host':'foreign.invalid'}],
    [url,{host:'foreign.invalid'}],[url,{'x-forwarded-host':'foreign.invalid'}],
    [internal,{'x-forwarded-host':'palmaauto.ru, foreign.invalid'}],
    [internal,{host:'palmaauto.ru, foreign.invalid'}],
    [internal,{'x-forwarded-host':'palmaauto.ru:443'}],
    ['ftp://0.0.0.0/admin-panel/ai-editor/voice',{host:'palmaauto.ru'}],
    ['http://user:pass@0.0.0.0:3000/admin-panel/ai-editor/voice',{host:'palmaauto.ru'}]]){
    const request=target.includes('user:pass@')?{url:target,headers:new Headers(headers),method:'GET'}:new Request(target,{headers});
    assert.equal((await handle(request)).status,404,JSON.stringify([target,headers]));
  }
  for(const suffix of ['?extra=1','#fragment','/extra'])
    assert.equal((await handle(new Request(internal+suffix,{headers:{host:'palmaauto.ru'}}))).status,404);
});
