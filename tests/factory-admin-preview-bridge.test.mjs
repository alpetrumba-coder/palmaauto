import assert from 'node:assert/strict';
import {createPublicKey, randomBytes, verify} from 'node:crypto';
import {test} from 'node:test';
import {createFactoryAdminHandler, gatewayRequestOptions, signGatewayRequest} from '../lib/factory-admin-bridge.ts';

const prefix='/admin-panel/ai-editor';
const mission='11111111-1111-4111-8111-111111111111';
const run='22222222-2222-4222-8222-222222222222';
const target=`${prefix}/preview/${mission}/${run}/admin-panel/bookings`;
const material=randomBytes(32).toString('hex');
const supportedBrowser='"Google Chrome";v="157", "Chromium";v="157"';
const adminPolicy="default-src 'none'; script-src 'unsafe-inline' data:; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; sandbox allow-scripts";
// Frozen reviewed Factory controller: 5954 UTF-8 bytes, LF-only.
const portablePolicy="default-src 'none'; script-src 'sha256-P0CWn6X93J3oEwDAJN6DxCi4svyJOoxykdfIcfFjb4w='; script-src-attr 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; sandbox allow-scripts";
const staticPolicy="default-src 'none'; script-src 'none'; form-action 'none'; sandbox";
const adminHeaders={'content-type':'text/html; charset=utf-8','content-security-policy':adminPolicy,
  'x-factory-admin-preview':'chessboard-v1','connection-allowlist':'()'};
const portableHeaders={...adminHeaders,'content-security-policy':portablePolicy,'x-factory-admin-preview':'chessboard-portable-v1'};
const request=(path=target,init)=>new Request('https://palmaauto.ru'+path,{...init,
  headers:{'sec-ch-ua':supportedBrowser,'sec-fetch-dest':'iframe',...Object.fromEntries(new Headers(init?.headers))}});
const reply=(headers=adminHeaders)=>({status:200,headers,body:Buffer.from('<script>synthetic()</script>')});
const handler=(options={})=>createFactoryAdminHandler({getSession:async()=>({role:'OWNER',staffId:'fixture-owner'}),
  authSecret:()=>material,transport:async()=>reply(),...options});

test('administrative preview accepts only the marked isolated document and preserves its CSP',async()=>{
  for(const query of ['', '?from=2026-11-09', '?tab=apts', '?hidden=1',
    '?from=2024-02-29&tab=cars&hidden=1']){
    const result=await handler()(request(target+query,{headers:{'sec-ch-ua':'"Google Chrome";v="152", "Chromium";v="152"'}}));
    assert.equal(result.status,200,target+query);
    assert.equal(result.headers.get('content-security-policy'),adminPolicy);
    assert.equal(result.headers.get('x-factory-admin-preview'),'chessboard-v1');
    assert.equal(result.headers.get('connection-allowlist'),'()');
    assert.equal(result.headers.get('permissions-policy'),'microphone=(), camera=(), geolocation=()');
    assert.equal(result.headers.get('cache-control'),'no-store');
    assert.equal(await result.text(),'<script>synthetic()</script>');
  }
});

test('complete canonical query is signed and forwarded unchanged without site cookies',async()=>{
  let signed;
  const path=target+'?from=2026-11-09&tab=apts&hidden=1';
  const result=await handler({transport:async value=>{signed=value;return reply();}})(request(path,
    {headers:{cookie:'admin_panel_session=PRIVATE_SITE_SESSION; factory_editor_session='+'a'.repeat(64)}}));
  assert.equal(result.status,200);
  assert.equal(signed.path,path);
  assert.equal(signed.message.split('\n')[2],path);
  assert.equal(gatewayRequestOptions(signed,'synthetic-ca').path,path);
  const key=createPublicKey(signed.publicKey),signature=Buffer.from(signed.headers['x-factory-signature'],'base64url');
  assert.equal(verify(null,Buffer.from(signed.message),key,signature),true);
  assert.equal(verify(null,Buffer.from(signed.message.replace('tab=apts','tab=cars')),key,signature),false);
  assert.equal(JSON.stringify(signed).includes('PRIVATE_SITE_SESSION'),false);
  assert.equal(signed.headers['x-factory-owner'],'a'.repeat(64));
});

test('query grammar rejects invalid dates, encoding, duplicate and unordered parameters before transport',async()=>{
  let calls=0;
  const handle=handler({transport:async()=>{calls++;return reply();}});
  for(const query of ['?from=2026-02-29','?from=2024-02-30','?from=2026-13-01','?from=2026-1-01',
    '?from=','?tab=rooms','?hidden=0','?hidden=1&tab=cars','?tab=apts&from=2026-11-09',
    '?tab=cars&tab=apts','?unknown=1','?tab=%63ars','?%74ab=cars','?tab=cars%26hidden=1',
    '?','?tab=cars&','?tab=cars&&hidden=1','?tab','?tab=cars=apts']){
    assert.equal((await handle(request(target+query))).status,400,query);
    assert.throws(()=>signGatewayRequest({method:'GET',path:target+query,body:Buffer.alloc(0),
      ownerCookie:'',staffId:'fixture-owner',authSecret:material}),query);
  }
  assert.equal(calls,0);
});

test('administrative query is restricted to exact GET target with two UUIDs',async()=>{
  let calls=0;
  const handle=handler({transport:async()=>{calls++;return reply();}});
  for(const path of [prefix+'/?tab=cars',prefix+'/chat/'+mission+'/state?tab=cars',
    target.replace('/bookings','/bookings/')+'?tab=cars',target.replace(mission,'bad')+'?tab=cars',
    target.replace('/bookings','/users')+'?tab=cars',target.replace('/admin-panel/bookings','/')+'?tab=cars']){
    assert.equal((await handle(request(path))).status,400,path);
  }
  const post={method:'POST',headers:{origin:'https://palmaauto.ru','content-type':'application/x-www-form-urlencoded'},body:'csrf=x'};
  assert.equal((await handle(request(target+'?tab=cars',post))).status,400);
  assert.equal(calls,0);
});

test('administrative script permission never reaches public paths or unmarked responses',async()=>{
  for(const path of [prefix+'/preview/'+mission+'/'+run+'/',target+'/extra',target.replace('/bookings','/users'),prefix+'/']){
    assert.equal((await handler()(request(path))).status,503,path);
  }
  for(const headers of [
    {'content-type':'text/html; charset=utf-8','content-security-policy':adminPolicy},
    {...adminHeaders,'x-factory-admin-preview':'other'},
    {...adminHeaders,'x-factory-admin-preview':['chessboard-v1','chessboard-v1']},
    {...adminHeaders,'content-type':'text/plain; charset=utf-8'},
    {...adminHeaders,'content-security-policy':adminPolicy+'; sandbox allow-same-origin'},
    {...adminHeaders,'content-security-policy':adminPolicy.replace("connect-src 'none'","connect-src 'self'")},
    {...adminHeaders,'content-security-policy':adminPolicy.replace('sandbox allow-scripts','sandbox allow-scripts allow-same-origin')},
  ])assert.equal((await handler({transport:async()=>reply(headers)})(request())).status,503,JSON.stringify(headers));
});

test('administrative query keeps the forty MiB preview response limit',async()=>{
  for(const size of [3*1024*1024,40*1024*1024+1]){
    const body=Buffer.alloc(size);
    const result=await handler({transport:async()=>({...reply(),body})})(request(target+'?tab=cars'));
    assert.equal(result.status,size>40*1024*1024?503:200);
    if(result.status===200)assert.equal((await result.arrayBuffer()).byteLength,size);
  }
});

test('public static sandbox remains usable and cannot enable inline scripts',async()=>{
  const path=prefix+'/preview/'+mission+'/'+run+'/';
  const result=await handler({transport:async()=>reply({'content-type':'text/html','content-security-policy':staticPolicy})})(request(path));
  assert.equal(result.status,200);
  assert.equal(result.headers.get('content-security-policy'),staticPolicy);
  assert.equal(result.headers.get('x-factory-admin-preview'),null);
  assert.equal((await handler({transport:async()=>reply({...adminHeaders,'content-security-policy':staticPolicy+'; sandbox allow-scripts'})})(request(path))).status,503);
});

test('owner editor fallback CSP limits frames to preview namespace and preserves voice policy',async()=>{
  const result=await handler({transport:async()=>reply({'content-type':'text/html'})})(request(prefix+'/'));
  assert.equal(result.status,200);
  assert.match(result.headers.get('content-security-policy'),/(?:^|;)\s*frame-src https:\/\/palmaauto\.ru\/admin-panel\/ai-editor\/preview\/;/);
  assert.equal(result.headers.get('permissions-policy'),'microphone=(self), camera=(), geolocation=()');
  const denied=await handler({getSession:async()=>({role:'OPERATOR',staffId:'fixture-owner'})})(request());
  assert.equal(denied.status,403);
});

test('legacy administrative response remains Chrome-only after exact response classification',async()=>{
  let calls=0;
  const handle=handler({transport:async()=>{calls++;return reply();}});
  for(const brand of [undefined,'','"Google Chrome";v="151", "Chromium";v="151"',
    '"Chromium";v="157"','"Microsoft Edge";v="157", "Chromium";v="157"',
    '"Microsoft Edge";v="157", "Google Chrome";v="157"',
    '"Google Chrome beta";v="157"','"Google Chrome";v="157", "Google Chrome";v="151"']){
    const init={headers:{'sec-fetch-dest':'iframe',...(brand===undefined?{}:{'sec-ch-ua':brand})}};
    const result=await handle(new Request('https://palmaauto.ru'+target,init));
    assert.equal(result.status,409,String(brand));
    const body=await result.text();
    assert.match(body,/Google Chrome 152/);
    assert.equal(body.includes('synthetic()'),false);
    assert.equal(result.headers.get('x-factory-admin-preview'),null);
    assert.equal(result.headers.get('connection-allowlist'),null);
  }
  assert.equal(calls,8);
});

test('administrative candidate is served only to an iframe or explicit isolated fetch',async()=>{
  let calls=0;
  const handle=handler({transport:async()=>{calls++;return reply();}});
  for(const destination of [undefined,'document','object','image','script','audio','Iframe']){
    const headers={'sec-ch-ua':supportedBrowser,...(destination===undefined?{}:{'sec-fetch-dest':destination})};
    const result=await handle(new Request('https://palmaauto.ru'+target,{headers}));
    assert.equal(result.status,409,String(destination));
    assert.equal(result.headers.get('x-factory-admin-preview'),null);
    assert.equal((await result.text()).includes('synthetic()'),false);
  }
  assert.equal(calls,0);
  assert.equal((await handle(request(target,{headers:{'sec-fetch-dest':'empty'}}))).status,200);
  assert.equal(calls,1);
});

test('administrative response must provide exact connection isolation policy',async()=>{
  const unprotected=Object.fromEntries(Object.entries(adminHeaders).filter(([key])=>key!=='connection-allowlist'));
  for(const headers of [unprotected,{...adminHeaders,'connection-allowlist':'*'},
    {...adminHeaders,'connection-allowlist':['()','()']}]){
    const result=await handler({transport:async()=>reply(headers)})(request());
    assert.equal(result.status,503);
    assert.equal(result.headers.get('x-factory-admin-preview'),null);
  }
});

test('portable exact document accepts Safari without client hints and Chromium browser brands',async()=>{
  const browsers=[
    {'user-agent':'Mozilla/5.0 Version/18.0 Safari/605.1.15'},
    {'sec-ch-ua':'"Microsoft Edge";v="157", "Chromium";v="157"'},
    {'sec-ch-ua':'"Yandex";v="25", "Chromium";v="157"'},
    {'sec-ch-ua':'"Google Chrome";v="152", "Chromium";v="152"'},
    {'sec-ch-ua':'not client hints'},
  ];
  for(const browser of browsers){
    let signed;
    const result=await handler({transport:async value=>{signed=value;return reply(portableHeaders);}})(
      new Request('https://palmaauto.ru'+target+'?tab=apts',{headers:{'sec-fetch-dest':'iframe',...browser}}));
    assert.equal(result.status,200,JSON.stringify(browser));
    assert.equal(result.headers.get('content-security-policy'),portablePolicy);
    assert.equal(result.headers.get('x-factory-admin-preview'),'chessboard-portable-v1');
    assert.equal(result.headers.get('connection-allowlist'),'()');
    assert.equal(result.headers.get('permissions-policy'),'microphone=(), camera=(), geolocation=()');
    assert.equal(result.headers.get('cache-control'),'no-store');
    assert.equal(await result.text(),'<script>synthetic()</script>');
    assert.equal(signed.path,target+'?tab=apts');
    assert.equal(Object.keys(signed.headers).some(key=>/sec-ch|user-agent|cookie|authorization/i.test(key)),false);
  }
});

test('portable exact response supports isolated fetch but never standalone or forged destinations',async()=>{
  let calls=0;
  const handle=handler({transport:async()=>{calls++;return reply(portableHeaders);}});
  const valid=await handle(new Request('https://palmaauto.ru'+target,{headers:{'sec-fetch-dest':'empty'}}));
  assert.equal(valid.status,200);
  assert.equal(calls,1);
  for(const destination of [undefined,'document','object','image','script','iframe, empty','Iframe']){
    const headers=destination===undefined?{}:{'sec-fetch-dest':destination};
    const result=await handle(new Request('https://palmaauto.ru'+target,{headers}));
    assert.equal(result.status,409,String(destination));
    assert.equal((await result.text()).includes('synthetic()'),false);
    assert.equal(result.headers.get('x-factory-admin-preview'),null);
  }
  assert.equal(calls,1);
});

test('portable and legacy marker-policy pairs cannot be mixed or broadened',async()=>{
  const invalid=[
    {...portableHeaders,'content-security-policy':adminPolicy},
    {...adminHeaders,'content-security-policy':portablePolicy},
    {...portableHeaders,'x-factory-admin-preview':'other'},
    {...portableHeaders,'x-factory-admin-preview':['chessboard-portable-v1','chessboard-portable-v1']},
    {...portableHeaders,'content-security-policy':[portablePolicy,portablePolicy]},
    {...portableHeaders,'content-security-policy':portablePolicy.replace(/(sha256-)([A-Za-z0-9+/])/,(_all,prefix,char)=>prefix+(char==='A'?'B':'A'))},
    {...portableHeaders,'content-security-policy':portablePolicy+'; script-src \'unsafe-inline\''},
    {...portableHeaders,'content-security-policy':portablePolicy+'; sandbox allow-same-origin'},
    {...portableHeaders,'content-type':'text/html'},
    {...portableHeaders,'connection-allowlist':'*'},
    Object.fromEntries(Object.entries(portableHeaders).filter(([key])=>key!=='connection-allowlist')),
  ];
  for(const headers of invalid){
    const result=await handler({transport:async()=>reply(headers)})(request());
    assert.equal(result.status,503,JSON.stringify(headers));
    assert.equal(result.headers.get('x-factory-admin-preview'),null);
    assert.equal((await result.text()).includes('synthetic()'),false);
  }
});

test('portable script permission cannot escape the exact administrative target or status',async()=>{
  for(const path of [prefix+'/',prefix+'/chat-client.js',target+'/extra',target.replace('/bookings','/users'),`${prefix}/preview/${mission}/${run}/`]){
    const result=await handler({transport:async()=>reply(portableHeaders)})(request(path));
    assert.equal(result.status,503,path);
    assert.equal((await result.text()).includes('synthetic()'),false);
  }
  const result=await handler({transport:async()=>({...reply(portableHeaders),status:503})})(request());
  assert.equal(result.status,503);
  assert.equal(result.headers.get('x-factory-admin-preview'),null);
  assert.equal((await result.text()).includes('synthetic()'),false);
});

test('portable preview retains OWNER, cookie, canonical-query and GET-body checks before transport',async()=>{
  let calls=0;
  const transport=async()=>{calls++;return reply(portableHeaders);};
  const safari=path=>new Request('https://palmaauto.ru'+path,{headers:{'sec-fetch-dest':'iframe'}});
  assert.equal((await handler({transport,getSession:async()=>null})(safari(target))).status,303);
  assert.equal((await handler({transport,getSession:async()=>({role:'OPERATOR',staffId:'fixture-owner'})})(safari(target))).status,403);
  assert.equal((await handler({transport})(safari(target+'?tab=cars&tab=apts'))).status,400);
  assert.equal((await handler({transport})(new Request('https://palmaauto.ru'+target,{headers:{'sec-fetch-dest':'iframe',cookie:'factory_editor_session=forged'}}))).status,403);
  assert.equal((await handler({transport})(new Request('https://palmaauto.ru'+target,{headers:{'sec-fetch-dest':'iframe','content-length':'1'}}))).status,400);
  assert.equal(calls,0);
});
