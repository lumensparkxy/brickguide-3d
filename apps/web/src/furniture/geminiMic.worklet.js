/* Local microphone capture only; no external code or network access. */
class GeminiMic extends AudioWorkletProcessor {
 constructor(){super();this.buffer=new Float32Array(2048);this.length=0;}
 process(inputs){const channels=inputs[0];if(!channels?.length)return true;const count=channels[0].length;
  for(let i=0;i<count;i++){let value=0;for(const channel of channels)value+=channel[i]??0;this.buffer[this.length++]=value/channels.length;if(this.length===this.buffer.length){this.port.postMessage(this.buffer,[this.buffer.buffer]);this.buffer=new Float32Array(2048);this.length=0;}}
  return true;
 }
}
registerProcessor('gemini-mic',GeminiMic);
