import {describe,expect,it,vi,afterEach} from 'vitest';
import white from '../../../../config/furniture/lack-30449908.json';
import black from '../../../../config/furniture/lack-80104268.json';
import oak from '../../../../config/furniture/lack-70319028.json';
import {parseTutorial,parseProduct,sourcePdfUrl} from './contracts';
import {readCoachProgress,saveCoachProgress} from './coachContracts';
import {voiceContext} from './voiceContext';
afterEach(()=>vi.unstubAllGlobals());
describe('real furniture finish contracts',()=>{
 it('keeps article, source, finish and voice context aligned',()=>{
  for(const raw of [white,black,oak]){const t=parseTutorial(raw);const context=voiceContext(t,10,'whole',null,null);expect(context.product.article_number).toBe(raw.product.article_number);expect(t.product.finish?.name).toBe(raw.product.finish.name);expect(sourcePdfUrl(t.coach_actions![2].source,t.product)).toContain(`article_number=${raw.product.article_number}`);}
 });
 it('uses the oak product care source without inventing a PDF page',()=>{const t=parseTutorial(oak),a=t.coach_actions!.at(-1)!;expect(a.source.document_id).toBeNull();expect(sourcePdfUrl(a.source,t.product)).toBe(oak.product.product_url);expect(voiceContext(t,10,'whole',null,null).source.page_number).toBeNull();expect(()=>parseTutorial({...oak,coach_actions:[{...oak.coach_actions.at(-1),source:{document_id:null,page_index:null,product_url:white.product.product_url}}]})).toThrow();});
 it('retains combined diagram and product warning references',()=>{const t=parseTutorial(black);expect(t.coach_actions![0].source.product_url).toBe(black.product.product_url);});
 it('rejects malformed finish material metadata',()=>{expect(()=>parseProduct({...white.product,finish:{...white.product.finish,base_color:'url(https://example.com)'}})).toThrow();});
 it('does not transfer user confirmation between finishes',()=>{const store=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>store.set(k,v)});const a=parseTutorial(white),b=parseTutorial(black);saveCoachProgress(a,{viewedActionId:'leg-2',confirmedActionIds:['screw-1'],checks:[]});expect(readCoachProgress(b).confirmedActionIds).toEqual([]);expect(readCoachProgress(b).viewedActionId).toBe('prepare');expect(readCoachProgress(a).viewedActionId).toBe('leg-2');});
});
