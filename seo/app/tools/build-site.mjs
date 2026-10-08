import {readFile,writeFile,readdir,mkdir,rm,cp,stat,lstat,symlink} from 'node:fs/promises';
import {resolve,dirname,join,extname,relative} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {spawn} from 'node:child_process';import {createHash} from 'node:crypto';
const app=resolve(dirname(fileURLToPath(import.meta.url)),'..');const config=JSON.parse(await readFile(join(app,'site.config.json'),'utf8'));
const args=process.argv.slice(2);function option(name,fallback){const i=args.indexOf(name);if(i<0)return fallback;if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing '+name);return args[i+1];}
const website=resolve(app,option('--website',config.websiteRoot)),shared=resolve(app,option('--shared',config.sharedRoot)),output=resolve(website,option('--output',config.outputDirectory));
if([website,shared,app].includes(output)||/\/(?:\.git|node_modules|\.agents|\.codex)(?:\/|$)/.test(output))throw Error('Unsafe output path');
const {readRegistry,landingPath,approvedPages}=await import(pathToFileURL(join(shared,'lib/landing-registry.mjs')));
const {publicRoutes,seoRewrites,currentSeoRewrites,INDEX_PATH}=await import(pathToFileURL(join(app,'tools/routes.mjs')));
// The registry is validated in full (fields, uniqueness, review hash, assets) before anything is built.
const registry=readRegistry(pathToFileURL(shared+'/'),{websiteRoot:website});const pages=approvedPages(registry);if(!pages.length)throw Error('No approved pages');
// Vercel reads routes from the committed vercel.json, so a stale file must stop the build rather than publish unrouted pages.
const vercelConfig=JSON.parse(await readFile(join(website,'vercel.json'),'utf8'));if(JSON.stringify(currentSeoRewrites(vercelConfig))!==JSON.stringify(seoRewrites(registry,config)))throw Error('vercel.json routes are out of date with the approved registry: run `npm run seo:routes` and commit');
const routes=publicRoutes(registry,config);
const origin=new URL(config.publicOrigin).origin;
async function walk(dir){const result=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isSymbolicLink())throw Error('Symlink in public sources');if(e.isDirectory())result.push(...await walk(p));else if(e.isFile())result.push(p);}return result;}
async function copyFile(from,to){await mkdir(dirname(to),{recursive:true});await cp(from,to);}
const publicDirs=['images','css','js','templates','audio','video','snippets'];const rootExtensions=new Set(['.html','.png','.webp','.ico','.svg','.css','.js','.webmanifest']);
const originals=[];for(const e of await readdir(website,{withFileTypes:true})){if(e.isDirectory()&&publicDirs.includes(e.name)){for(const f of await walk(join(website,e.name)))if(new Set([...rootExtensions,'.mp4','.webm','.mp3','.wav','.ogg','.ttf','.woff','.woff2','.otf','.jpg','.jpeg','.gif','.json','.txt']).has(extname(f)))originals.push(relative(website,f));}else if(e.isFile()&&(rootExtensions.has(extname(e.name))||['robots.txt','sitemap.xml','llms.txt'].includes(e.name)))originals.push(e.name);}
for(const route of routes){try{await stat(join(website,route.slice(1)+'.html'));throw Error('Existing page collision: '+route);}catch(e){if(e.code!=='ENOENT')throw e;}}
const originalHashes={};for(const f of originals)originalHashes[f]=createHash('sha256').update(await readFile(join(website,f))).digest('hex');
// Generate aliases/config from relative source locations; no transformed renderer copy.
const tsconfig=JSON.parse(await readFile(join(app,'tsconfig.json'),'utf8'));tsconfig.compilerOptions.paths={'@/*':[relative(app,shared).replaceAll('\\','/')+'/*']};await writeFile(join(app,'tsconfig.json'),JSON.stringify(tsconfig,null,2)+'\n');
await writeFile(join(app,'tailwind.config.ts'),`import type {Config} from 'tailwindcss';const config:Config={content:['./app/**/*.{ts,tsx}','${relative(app,shared).replaceAll('\\','/')}/components/**/*.{ts,tsx}'],theme:{extend:{fontFamily:{sans:['Inter','sans-serif']}}},plugins:[]};export default config;\n`);
await rm(join(app,'.next'),{recursive:true,force:true});await rm(join(app,'out'),{recursive:true,force:true});await rm(join(app,'public'),{recursive:true,force:true});
await mkdir(join(app,'public'),{recursive:true});await cp(join(shared,'public/ai-answering-service'),join(app,'public/ai-answering-service'),{recursive:true});
try{await lstat(join(shared,'node_modules'));}catch(e){if(e.code!=='ENOENT')throw e;await symlink(join(app,'node_modules'),join(shared,'node_modules'),'dir');}
const executable=join(app,'node_modules/next/dist/bin/next');
await new Promise((ok,no)=>{const child=spawn(process.execPath,[executable,'build'],{cwd:app,env:{PATH:process.env.PATH,TMPDIR:process.env.TMPDIR||'/tmp',CI:'true',NEXT_TELEMETRY_DISABLED:'1',CIRCLE_NODE_TOTAL:'3'},stdio:'inherit'});child.once('error',no);child.once('exit',code=>code===0?ok():no(Error('Static build failed '+code)));});
const exported=await walk(join(app,'out'));const html=exported.filter(f=>f.endsWith('.html')&&!f.endsWith('/404.html')).map(f=>relative(join(app,'out'),f).slice(0,-5));const expected=routes.map(r=>r.slice(1)).sort();
// The index page is always exported by Next; it is published only when the catalog outgrows the homepage navigation.
const exportedRoutes=html.filter(r=>expected.includes(r)||r!==INDEX_PATH.slice(1)).sort();if(JSON.stringify(exportedRoutes)!==JSON.stringify(expected))throw Error('Exported route allowlist mismatch: '+JSON.stringify(exportedRoutes)+' vs '+JSON.stringify(expected));
// Staging tree is separate; cleanup removes obsolete generated chunks/routes.
const stage=output+'.building';await rm(stage,{recursive:true,force:true});await mkdir(stage,{recursive:true});
for(const f of originals)await copyFile(join(website,f),join(stage,f));
for(const f of exported){const rel=relative(join(app,'out'),f);if(rel.startsWith('_next/')||rel.startsWith('ai-answering-service/assets/')||expected.some(p=>rel===p+'.html'||rel===p+'.txt'))await copyFile(f,join(stage,rel));}
const sitemapPath=join(stage,'sitemap.xml');let sitemap=await readFile(sitemapPath,'utf8');for(const route of routes){const url=origin+route;if(!sitemap.includes('<loc>'+url+'</loc>'))sitemap=sitemap.replace('</urlset>',`  <url><loc>${url}</loc></url>\n</urlset>`);}await writeFile(sitemapPath,sitemap);
// Original homepage and navigation are copied byte-for-byte; guide links stay on guide pages.

const all=await walk(stage);if(all.some(f=>/\.(sql|md|env)$/i.test(f)||relative(stage,f).startsWith('api/')||relative(stage,f).startsWith('seo/')))throw Error('Internal source leaked into static output');
for(const route of routes){const body=await readFile(join(stage,route.slice(1)+'.html'),'utf8');if(!body.includes('index, follow')||!body.includes(origin+route)||body.includes('Private editorial review')||body.includes('simulated receipt')||body.includes('<form'))throw Error('Public route invariant failed');}
const hashes={};for(const f of all)hashes[relative(stage,f)]=createHash('sha256').update(await readFile(f)).digest('hex');
for(const f of originals){const now=createHash('sha256').update(await readFile(join(website,f))).digest('hex');if(now!==originalHashes[f])throw Error('Source changed during build');}
await rm(output,{recursive:true,force:true});await cp(stage,output,{recursive:true});await rm(stage,{recursive:true,force:true});
const metadata=join(app,'.release');await mkdir(metadata,{recursive:true});await writeFile(join(metadata,'manifest.json'),JSON.stringify({origin,pages:pages.map(landingPath),routes,sourcePublicFiles:originals.length,sourceHashes:originalHashes,outputHashes:hashes,generatedAt:new Date().toISOString(),databaseChanges:false,originalApiSourceUntouched:true},null,2)+'\n');
console.log(`PASS clean integrated static build: ${pages.length} approved pages${routes.length>pages.length?' + guide index':''}, ${originals.length} original public files; internal files excluded; existing API source unchanged`);
