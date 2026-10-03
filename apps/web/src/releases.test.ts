import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from '../../../tests/fixtures/synthetic.scene.json';
import { assetBase, parseConfig, parseRelease, ReleaseLoader } from './releases';
import { parseSet } from './validation';
vi.stubGlobal('location',{origin:'http://localhost:5173'});
const bytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value));
const digest=async(value:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',value as BufferSource))].map(v=>v.toString(16).padStart(2,'0')).join('');
async function releaseFixture(){
  const steps=fixture.steps.map((s,i)=>({...s,section_id:i<2?'first':'second',main_step_number:i<2?s.main_step_number:1}));
  const payloads=steps.map(s=>bytes({steps:[s]}));
  const chunks=await Promise.all(payloads.map(async(p,index)=>({index,path:`chunks/${index}.json`,sha256:await digest(p),bytes:p.length,step_ids:[steps[index].step_id]})));
  return {payloads,manifest:{...fixture,schema_version:'2.0',release_sha256:'a'.repeat(64),sources:[{guide_id:'synthetic',source_sha256:fixture.source_sha256,official_url:'https://www.lego.com/test.pdf',page_count:4}],sections:['first','second'].map(section_id=>({section_id,source_sha256:fixture.source_sha256,label:section_id})),step_index:steps.map(({poses,...s},chunk_index)=>({...s,chunk_index})),chunks,asset_base_url:'/releases/synthetic/',geometry_base_url:'/releases/synthetic/ldraw/'}};
}
afterEach(()=>vi.unstubAllGlobals());
describe('published release transport',()=>{
  it('fails closed on invalid mode and untrusted geometry origins',()=>{
    vi.stubGlobal('location',{origin:'http://localhost:5173'});
    expect(()=>parseConfig({mode:'anything',source_images:true,requests_enabled:true})).toThrow();
    for(const url of ['https://evil.test/','//evil.test/','/../escape/','https://storage.googleapis.com/bucket/?secret=1'])expect(()=>assetBase(url)).toThrow();
  });
  it('allows unknown catalogue requests only in public mode',()=>{const unknown={set_number:'99999',name:null,official_page:null,guides:[]};expect(parseSet(unknown,true).guides).toEqual([]);expect(()=>parseSet(unknown)).toThrow();});
  it('preserves number resets and verifies immutable snapshot bytes',async()=>{
    vi.stubGlobal('location',{origin:'http://localhost:5173'});
    const {manifest,payloads}=await releaseFixture();
    const fetcher=vi.fn(async(url:URL)=>new Response(payloads[Number(url.pathname.split('/').at(-1)!.split('.')[0])] as BodyInit));vi.stubGlobal('fetch',fetcher);
    const loader=new ReleaseLoader(manifest);const scene=await loader.window(0);
    expect(scene.steps[2].section_id).toBe('second');expect(scene.steps[2].main_step_number).toBe(1);
    expect(Object.isFrozen(scene.steps[0].poses)).toBe(true);expect(scene.steps[0].poses).toEqual(fixture.steps[0].poses);
    expect(fetcher.mock.calls.length).toBe(2); // current and neighbour only
    const next=await loader.window(2);expect(next.steps[2].poses).toEqual(fixture.steps[2].poses);
    expect(next.steps[2].introduced_instance_ids).toEqual([]);
  });
  it('rejects altered bytes, duplicate IDs and foreign source attribution',async()=>{
    vi.stubGlobal('location',{origin:'http://localhost:5173'});
    const {manifest,payloads}=await releaseFixture();
    vi.stubGlobal('fetch',async(url:URL)=>new Response(new Uint8Array(payloads[Number(url.pathname.split('/').at(-1)!.split('.')[0])].length)));
    await expect(new ReleaseLoader(manifest).window(0)).rejects.toThrow('checksum');
    const duplicate=structuredClone(manifest);duplicate.instances[1].instance_id=duplicate.instances[0].instance_id;expect(()=>parseRelease(duplicate)).toThrow('part');
    const foreign=structuredClone(manifest);foreign.step_index[0].source.source_sha256='b'.repeat(64);expect(()=>parseRelease(foreign)).toThrow('source');
  });
});
