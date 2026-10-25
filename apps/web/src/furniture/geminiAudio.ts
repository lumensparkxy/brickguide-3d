/** Streaming averaging resampler; carry fractional sample weight across worklet blocks. */
export class PcmResampler {
 private weight=0;private sum=0;
 constructor(private inputRate:number,private outputRate=16000){if(inputRate<outputRate)throw Error('Microphone sample rate is too low.');}
 convert(input:Float32Array){const output:number[]=[],ratio=this.inputRate/this.outputRate;
  for(const sample of input){let left=1;while(left>1e-9){const take=Math.min(left,ratio-this.weight);this.sum+=sample*take;this.weight+=take;left-=take;if(this.weight>=ratio-1e-9){output.push(this.sum/ratio);this.weight=0;this.sum=0;}}}
  return new Float32Array(output);
 }
}
export function encodePcm(samples:Float32Array){const bytes=new Uint8Array(samples.length*2),view=new DataView(bytes.buffer);samples.forEach((sample,i)=>{const x=Math.max(-1,Math.min(1,Number.isFinite(sample)?sample:0));view.setInt16(i*2,Math.round(x*(x<0?32768:32767)),true);});let text='';for(const byte of bytes)text+=String.fromCharCode(byte);return btoa(text);}
export function decodePcm(data:string){const text=atob(data);if(text.length%2)throw Error('Invalid PCM audio.');const bytes=Uint8Array.from(text,c=>c.charCodeAt(0)),view=new DataView(bytes.buffer),samples=new Float32Array(bytes.length/2);for(let i=0;i<samples.length;i++)samples[i]=view.getInt16(i*2,true)/32768;return samples;}
export class GeminiAudio {
 readonly context:AudioContext;private mic:MediaStreamAudioSourceNode|null=null;private worklet:AudioWorkletNode|null=null;private silent:GainNode|null=null;private sources=new Set<AudioBufferSourceNode>();private next=0;private closed=false;
 private envelopes=new Map<AudioBufferSourceNode,{start:number;end:number;windowSeconds:number;levels:Float32Array}>();
 constructor(){this.context=new AudioContext({sampleRate:16000});}
 get playbackIdle(){return !this.closed&&this.context.state==='running'&&this.sources.size===0;}
 /** RMS of the scheduled output PCM at the audio clock, not microphone activity. */
 get outputLevel(){
  if(this.closed||this.context.state!=='running')return 0;
  const now=this.context.currentTime;
  for(const envelope of this.envelopes.values()){
   if(now>=envelope.start&&now<envelope.end){const index=Math.floor((now-envelope.start)/envelope.windowSeconds);return Math.min(1,envelope.levels[index]??0);}
  }
  return 0;
 }
 async resume(){await this.context.resume();if(this.context.state!=='running')throw Error('Audio playback is blocked.');}
 async attachMic(stream:MediaStream,onPcm:(data:string)=>void){
  await this.context.audioWorklet.addModule(new URL('./geminiMic.worklet.js',import.meta.url));if(this.closed)return;
  const resampler=new PcmResampler(this.context.sampleRate);this.mic=this.context.createMediaStreamSource(stream);this.worklet=new AudioWorkletNode(this.context,'gemini-mic');this.silent=this.context.createGain();this.silent.gain.value=0;
  this.worklet.port.onmessage=event=>{if(this.closed)return;const data=resampler.convert(event.data);if(data.length)onPcm(encodePcm(data));};
  this.mic.connect(this.worklet);this.worklet.connect(this.silent);this.silent.connect(this.context.destination);
 }
 play(data:string,rate=24000){
  if(this.closed||data.length>2_000_000)return;
  const samples=decodePcm(data);if(!samples.length)return;
  if(this.next-this.context.currentTime>60)throw Error('Voice response exceeded the playback queue limit.');
  const buffer=this.context.createBuffer(1,samples.length,rate);buffer.getChannelData(0).set(samples);
  const node=this.context.createBufferSource();node.buffer=buffer;node.connect(this.context.destination);this.sources.add(node);
  node.onended=()=>{this.sources.delete(node);this.envelopes.delete(node);node.disconnect();};
  const when=Math.max(this.context.currentTime+.015,this.next),windowSamples=Math.max(1,Math.round(rate*.03));
  const levels=new Float32Array(Math.ceil(samples.length/windowSamples));
  for(let window=0;window<levels.length;window++){
   const start=window*windowSamples,end=Math.min(samples.length,start+windowSamples);let energy=0;
   for(let i=start;i<end;i++)energy+=samples[i]*samples[i];
   levels[window]=Math.sqrt(energy/(end-start));
  }
  this.envelopes.set(node,{start:when,end:when+buffer.duration,windowSeconds:windowSamples/rate,levels});
  node.start(when);this.next=when+buffer.duration;
 }
 interrupt(){for(const source of this.sources){source.onended=null;try{source.stop();}catch{/* Already ended. */}source.disconnect();}this.sources.clear();this.envelopes.clear();this.next=0;}
 close(){if(this.closed)return;this.closed=true;this.interrupt();if(this.worklet){this.worklet.port.onmessage=null;this.worklet.port.close();this.worklet.disconnect();}this.mic?.disconnect();this.silent?.disconnect();void this.context.close().catch(()=>{});}
}
