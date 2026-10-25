import {parseCoachActions,type CoachAction} from './coachContracts';
export interface FurnitureDocument { id: string; title: string; url: string; [key: string]: unknown }
export interface FurnitureFinish {id:string;name:string;base_color:string;wood_effect:boolean}
export interface FurnitureProduct {
  family_id?:string; finish?:FurnitureFinish;
  article_number: string; display_article_number: string; name: string; variant: string;
  dimensions_mm: Record<string, number>; product_url: string; documents: FurnitureDocument[];
}
export interface FurnitureSource {document_id:string|null;page_index:number|null;product_url?:string|null}
export function parseFurnitureSource(v:unknown,product:FurnitureProduct):FurnitureSource {
  const s=record(v);if(s.product_url!=null&&s.product_url!==product.product_url)throw Error('Invalid product source.');
  if(s.document_id==null&&s.page_index==null&&s.product_url===product.product_url)return {document_id:null,page_index:null,product_url:product.product_url};
  const id=str(s.document_id);if(!product.documents.some(d=>d.id===id))throw Error('Unknown source document.');
  return {document_id:id,page_index:nonnegative(s.page_index),product_url:s.product_url==null?null:product.product_url};
}
export function sourcePdfUrl(s:FurnitureSource,p:FurnitureProduct){return s.document_id?`/api/v1/furniture/documents/${encodeURIComponent(s.document_id)}/pdf?article_number=${p.article_number}#page=${(s.page_index??0)+1}`:s.product_url??p.product_url;}
export function sourceImageUrl(s:FurnitureSource,p:FurnitureProduct){return `/api/v1/furniture/documents/${encodeURIComponent(s.document_id??'')}/pages/${s.page_index??0}?article_number=${p.article_number}`;}
export interface FurnitureStep {
  id: string; title: string; instruction: string;
  kind: 'prepare' | 'insert_screws' | 'attach_legs' | 'finish';
  source: FurnitureSource; active_components: string[];
  secondary_source?: FurnitureSource | null;
  help: {question: string; answer: string}[]; warnings: string[];
}
export interface FurnitureTutorial {
  coach_actions?:CoachAction[];
  schema_version: string; product: FurnitureProduct; revision: string; source_sha256: string;
  review: {agent_review: string; human_review: string; physical_build: string};
  components: {id: string; name: string; quantity: number; hardware_id?: string | null; description: string}[];
  warnings: string[]; steps: FurnitureStep[];
}
function record(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('The furniture data has an invalid format.');
  return v as Record<string, unknown>;
}
function str(v: unknown): string { if (typeof v !== 'string' || !v.trim()) throw new Error('The furniture data is incomplete.'); return v; }
function strings(v: unknown): string[] { if (!Array.isArray(v)) throw new Error('Invalid furniture list.'); return v.map(str); }
function list(v: unknown): unknown[] { if (!Array.isArray(v)) throw new Error('Invalid furniture list.'); return v; }
function nonnegative(v: unknown) { if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) throw new Error('Invalid furniture index.'); return v; }
export function parseProduct(v: unknown): FurnitureProduct {
  const p = record(v); const dimensions = record(p.dimensions_mm);
  for (const n of Object.values(dimensions)) if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) throw new Error('Invalid furniture dimensions.');
  const url = str(p.product_url); if (!url.startsWith('https://www.ikea.com/')) throw new Error('Invalid official product link.');
  let finish:FurnitureFinish|undefined;
  if(p.finish!=null){const f=record(p.finish);if(!/^#[0-9a-f]{6}$/i.test(str(f.base_color))||typeof f.wood_effect!=='boolean')throw new Error('Invalid furniture finish.');finish={id:str(f.id),name:str(f.name),base_color:str(f.base_color),wood_effect:f.wood_effect};}
  return {family_id:p.family_id==null?undefined:str(p.family_id),finish,article_number: str(p.article_number), display_article_number: str(p.display_article_number), name: str(p.name), variant: str(p.variant), dimensions_mm: dimensions as Record<string, number>, product_url: url, documents: list(p.documents).map(d => {const doc = record(d); const link=str(doc.url);if(!link.startsWith('https://www.ikea.com/'))throw new Error('Invalid official document link.');return {...doc, id: str(doc.id), title: str(doc.title), url: link};})};
}
export function parseProducts(v: unknown): FurnitureProduct[] {return list(record(v).products).map(parseProduct);}
export function parseTutorial(v: unknown): FurnitureTutorial {
  const t = record(v); const review = record(t.review); const product = parseProduct(t.product);
  if (t.schema_version !== '1.0') throw new Error('This tutorial version is not supported.');
  const hash = str(t.source_sha256); if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('Missing tutorial source identity.');
  const components = list(t.components).map(c => {const p = record(c); const quantity = nonnegative(p.quantity); if (!quantity) throw new Error('Invalid component count.'); return {id: str(p.id), name: str(p.name), quantity, hardware_id: p.hardware_id == null ? null : str(p.hardware_id), description: str(p.description)};});
  const ids = new Set(components.map(c => c.id)); if (ids.size !== components.length) throw new Error('Repeated component identity.');
  const steps = list(t.steps).map(s => {const p = record(s); const source = record(p.source); const kind = str(p.kind); if (!['prepare','insert_screws','attach_legs','finish'].includes(kind)) throw new Error('Unknown assembly action.'); const active = strings(p.active_components); if (active.some(id => !ids.has(id))) throw new Error('Unknown active component.'); const parsedSource=parseFurnitureSource(source,product);const secondary_source=p.secondary_source==null?null:parseFurnitureSource(p.secondary_source,product);return {secondary_source,id: str(p.id),title: str(p.title),instruction:str(p.instruction),kind:kind as FurnitureStep['kind'],source:parsedSource,active_components:active,help:list(p.help).map(h=>{const a=record(h);return {question:str(a.question),answer:str(a.answer)};}),warnings:strings(p.warnings)};});
  if (!steps.length || new Set(steps.map(s => s.id)).size !== steps.length) throw new Error('Invalid tutorial sequence.');
  return {coach_actions:parseCoachActions(t.coach_actions,{product}),schema_version:'1.0',product,revision:str(t.revision),source_sha256:hash,review:{agent_review:str(review.agent_review),human_review:str(review.human_review),physical_build:str(review.physical_build)},components,warnings:strings(t.warnings),steps};
}
export async function furnitureRequest(path: string): Promise<unknown> {
  const response = await fetch(`/api/v1/furniture${path}`);
  if (!response.ok) throw new Error(response.status === 503 ? 'The official documents are not prepared yet. Ask the local operator to run the furniture preparation command, then retry.' : response.status === 404 ? 'This product is not supported yet.' : 'The furniture assistant could not load this information. Please retry.');
  return response.json();
}
export function progressKey(t: FurnitureTutorial) {return `furniture:v1:${t.product.article_number}:${t.source_sha256}:${t.revision}`;}
export function readFurnitureProgress(t: FurnitureTutorial): number {
  try { const raw = localStorage.getItem(progressKey(t)); if (raw === null) return 0; const id: unknown = JSON.parse(raw); const index = t.steps.findIndex(s => s.id === id); return Math.max(0,index); } catch {return 0;}
}
export function saveFurnitureProgress(t: FurnitureTutorial, step: number): boolean {
  try {localStorage.setItem(progressKey(t), JSON.stringify(t.steps[step].id)); return true;} catch {return false;}
}
