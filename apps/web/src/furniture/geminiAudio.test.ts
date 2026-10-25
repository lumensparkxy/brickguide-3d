import {describe,it,expect,vi} from 'vitest';
import {encodePcm,decodePcm,PcmResampler,GeminiAudio} from './geminiAudio';
describe('Gemini PCM transport',()=>{
 it('encodes signed16 little endian and clamps invalid samples',()=>{const bytes=Array.from(atob(encodePcm(new Float32Array([-1,0,1,2,NaN]))),c=>c.charCodeAt(0));expect(bytes).toEqual([0,128,0,0,255,127,255,127,0,0]);});
 it('decodes output PCM for audio buffer playback',()=>{expect([...decodePcm(encodePcm(new Float32Array([-1,0,.5])))]).toEqual([-1,0,.5]);expect(()=>decodePcm(btoa('x'))).toThrow();});
 it('downsamples48k mono to16k without changing duration',()=>{const out=new PcmResampler(48000).convert(new Float32Array(48000).fill(.5));expect(out.length).toBe(16000);expect(out[0]).toBe(.5);});
 it('preserves fractional44.1k sample boundaries across capture blocks',()=>{const input=Float32Array.from({length:4410},(_,i)=>Math.sin(i/15));const whole=new PcmResampler(44100).convert(input),split=new PcmResampler(44100);const a=split.convert(input.slice(0,2048)),b=split.convert(input.slice(2048));expect([...a,...b]).toEqual([...whole]);expect(whole.length).toBe(1600);});
});

it('waits for audible output to finish and does not report suspended audio as idle',()=>{
 let ended:(()=>void)|null=null;
 class Context {state='running';currentTime=0;destination={};createBuffer(_c:number,n:number,r:number){return {duration:n/r,getChannelData:()=>new Float32Array(n)};}createBufferSource(){return {buffer:null,connect(){},disconnect(){},start(){},stop(){},set onended(cb:(()=>void)|null){ended=cb;}};}close(){this.state='closed';return Promise.resolve();}}
 vi.stubGlobal('AudioContext',Context);try{const sound=new GeminiAudio();expect(sound.playbackIdle).toBe(true);sound.play(encodePcm(new Float32Array([.1,.2])));expect(sound.playbackIdle).toBe(false);(ended as unknown as ()=>void)();expect(sound.playbackIdle).toBe(true);Object.assign(sound.context,{state:'suspended'});expect(sound.playbackIdle).toBe(false);sound.close();expect(sound.playbackIdle).toBe(false);}finally{vi.unstubAllGlobals();}
});
it('fails rather than silently discarding a long narrated checklist',()=>{
 class Context {state='running';currentTime=0;destination={};createBuffer(_c:number,n:number,r:number){return {duration:n/r,getChannelData:()=>new Float32Array(n)};}createBufferSource(){return {buffer:null,onended:null,connect(){},disconnect(){},start(){},stop(){}};}close(){this.state='closed';return Promise.resolve();}}
 vi.stubGlobal('AudioContext',Context);try{const sound=new GeminiAudio(),chunk=encodePcm(new Float32Array(24000*21));sound.play(chunk);sound.play(chunk);sound.play(chunk);expect(()=>sound.play(chunk)).toThrow('playback queue limit');expect(sound.playbackIdle).toBe(false);sound.close();}finally{vi.unstubAllGlobals();}
});

describe('scheduled output energy for Nandi',()=>{
 function fixture(){
  const nodes:{onended:(()=>void)|null;start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>}[]=[];
  class Context {state='running';currentTime=0;destination={};createBuffer(_c:number,n:number,r:number){return {duration:n/r,getChannelData:()=>new Float32Array(n)};}createBufferSource(){const node={buffer:null,onended:null as (()=>void)|null,connect(){},disconnect(){},start:vi.fn(),stop:vi.fn()};nodes.push(node);return node;}close(){this.state='closed';return Promise.resolve();}}
  vi.stubGlobal('AudioContext',Context);return {sound:new GeminiAudio(),nodes};
 }
 it('reports silence before the scheduled start and the RMS window at the audio clock',()=>{
  const {sound,nodes}=fixture();try{
   const samples=new Float32Array(2160);samples.fill(.2,720,1440);samples.fill(.8,1440);
   sound.play(encodePcm(samples));expect(nodes[0].start).toHaveBeenCalledWith(.015);
   expect(sound.outputLevel).toBe(0);Object.assign(sound.context,{currentTime:.025});expect(sound.outputLevel).toBe(0);
   Object.assign(sound.context,{currentTime:.055});expect(sound.outputLevel).toBeCloseTo(.2,3);
   Object.assign(sound.context,{currentTime:.085});expect(sound.outputLevel).toBeCloseTo(.8,3);
   Object.assign(sound.context,{currentTime:.11});expect(sound.outputLevel).toBe(0);
  }finally{sound.close();vi.unstubAllGlobals();}
 });
 it('uses the queued clip only when that clip starts, including its final partial window',()=>{
  const {sound,nodes}=fixture();try{
   sound.play(encodePcm(new Float32Array(2400).fill(.25)));
   sound.play(encodePcm(new Float32Array(960).fill(.75)));
   expect(nodes[1].start.mock.calls[0][0]).toBeCloseTo(.115);
   Object.assign(sound.context,{currentTime:.11});expect(sound.outputLevel).toBeCloseTo(.25,3);
   Object.assign(sound.context,{currentTime:.12});expect(sound.outputLevel).toBeCloseTo(.75,3);
   Object.assign(sound.context,{currentTime:.15});expect(sound.outputLevel).toBeCloseTo(.75,3);
   Object.assign(sound.context,{currentTime:.16});expect(sound.outputLevel).toBe(0);
  }finally{sound.close();vi.unstubAllGlobals();}
 });
 it('clears output on suspended audio, ended nodes, interruption and close',()=>{
  const {sound,nodes}=fixture();try{
   const clip=encodePcm(new Float32Array(2400).fill(1));sound.play(clip);
   Object.assign(sound.context,{currentTime:.03});expect(sound.outputLevel).toBeCloseTo(1,3);
   Object.assign(sound.context,{state:'suspended'});expect(sound.outputLevel).toBe(0);
   Object.assign(sound.context,{state:'running'});expect(sound.outputLevel).toBeGreaterThan(.9);
   nodes[0].onended?.();expect(sound.outputLevel).toBe(0);
   sound.play(clip);Object.assign(sound.context,{currentTime:.13});expect(sound.outputLevel).toBeGreaterThan(.9);
   sound.interrupt();expect(sound.outputLevel).toBe(0);expect(nodes[1].stop).toHaveBeenCalled();
   sound.play(clip);Object.assign(sound.context,{currentTime:.16});expect(sound.outputLevel).toBeGreaterThan(.9);
   sound.close();expect(sound.outputLevel).toBe(0);
  }finally{sound.close();vi.unstubAllGlobals();}
 });
});
