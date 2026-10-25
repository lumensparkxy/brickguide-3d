import '../styles.css';
import {Component, lazy, Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode, type KeyboardEvent} from 'react';
import {sourcePdfUrl,sourceImageUrl,furnitureRequest, parseProducts, parseProduct, parseTutorial, readFurnitureProgress, saveFurnitureProgress, type FurnitureProduct, type FurnitureTutorial} from './contracts';
import './furniture.css';
import './workspace.css';
import './stableViewer.css';
import ViewerControls from './ViewerControls';
const Coach = lazy(()=>import('./Coach'));
const FurnitureViewport = lazy(() => import('./FurnitureViewport'));
function ViewerPlaceholder({message,busy=false}:{message:string;busy?:boolean}){return <div className="stable-viewer" aria-busy={busy}><div className="connection-view-switch">{['Full assembly','Connection close-up','Whole table'].map(name=><button key={name} disabled>{name}</button>)}</div><div className="stable-scene-placeholder" role="status">{message}</div><ViewerControls controller={null}/><div className="stable-viewer-details"/></div>;}
class IllustrationBoundary extends Component<{children: ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<ViewerPlaceholder message="The 3D illustration could not load. Continue with the official diagram and written instructions, or reload to retry."/>:this.props.children;}
}
const humanStatus = (s: string) => s.replaceAll('_', ' ');
export default function FurnitureApp() {
  const [variants,setVariants]=useState<FurnitureProduct[]>([]);
  const [variantNotice,setVariantNotice]=useState('');
  const [query,setQuery] = useState(''); const [products,setProducts] = useState<FurnitureProduct[] | null>(null);
  const [failedProduct,setFailedProduct] = useState<FurnitureProduct | null>(null);
  const [loading,setLoading] = useState(false); const [error,setError] = useState('');
  const [tutorial,setTutorial] = useState<FurnitureTutorial | null>(null); const [index,setIndex] = useState(0);
  const [autoPlayStep,setAutoPlayStep]=useState<string|null>(null);
  const [replay,setReplay] = useState(0); const [selectedComponent,setSelectedComponent] = useState<string|null>(null);
  const [phone,setPhone] = useState(()=>window.matchMedia('(max-width:720px)').matches); const [imageError,setImageError] = useState(false); const [canSave,setCanSave] = useState(true);
  const [view,setView] = useState<'instruction'|'model'|'guide'>('model'); const instruction = useRef<HTMLElement>(null); const helpDialog=useRef<HTMLDialogElement>(null);
  const step = tutorial?.steps[index];
  const coachActive=!!tutorial?.coach_actions?.length&&new URLSearchParams(location.search).get('experience')!=='legacy';
  const selectedCategory=selectedComponent?.startsWith('leg-')?'legs':selectedComponent?.startsWith('screw-')?'screws':selectedComponent;
  useEffect(()=>{const media=window.matchMedia('(max-width:720px)');const changed=()=>setPhone(media.matches);media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed);},[]);
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const article=params.get('product');if(!article)return;
    let cancelled=false;setLoading(true);
    furnitureRequest(`/products/${encodeURIComponent(article)}`).then(parseProduct).then(p=>{if(!cancelled)setFailedProduct(p);return furnitureRequest(`/products/${encodeURIComponent(article)}/tutorial`);}).then(parseTutorial).then(data=>{
      if(cancelled)return;
      const requested=data.steps.findIndex(s=>s.id===params.get('step'));
      setIndex(requested>=0?requested:readFurnitureProgress(data));setTutorial(data);setFailedProduct(data.product);
    }).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'Unable to open the connection preview.');})
      .finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;};
  },[]);
  useEffect(()=>{let cancelled=false;furnitureRequest('/products').then(parseProducts).then(p=>{if(!cancelled)setVariants(p);}).catch(()=>{});return()=>{cancelled=true;};},[]);
  function selectComponent(id:string) {setSelectedComponent(id);setView('model');}

  useEffect(() => {const old=document.title;document.title='Furniture Assembly Assistant';return()=>{document.title=old;};},[]);
  useEffect(() => {if (tutorial&&!coachActive) setCanSave(saveFurnitureProgress(tutorial,index));},[tutorial,index,coachActive]);
  useEffect(() => {setImageError(false);},[step?.source.document_id,step?.source.page_index]);
  async function find(value: string) {
    setLoading(true);setError('');setProducts(null);setFailedProduct(null);
    try {setProducts(parseProducts(await furnitureRequest(`/products?q=${encodeURIComponent(value.trim())}`)));}
    catch(e) {setError(e instanceof Error?e.message:'Unable to find furniture.');}
    finally {setLoading(false);}
  }
  async function open(product: FurnitureProduct) {
    setAutoPlayStep(null);
    const changed=!!tutorial&&tutorial.product.article_number!==product.article_number;
    if(changed){setTutorial(null);setVariantNotice('Finish changed. Voice is off; start the coach again for this product. Each article keeps its own progress.');}
    const url=new URL(location.href);url.searchParams.set('product',product.article_number);url.searchParams.delete('action');url.searchParams.delete('step');history.replaceState(null,'',url);
    setLoading(true);setError('');setFailedProduct(product);
    try {const data=parseTutorial(await furnitureRequest(`/products/${encodeURIComponent(product.article_number)}/tutorial`));setIndex(readFurnitureProgress(data));setTutorial(data);window.scrollTo(0,0);}
    catch(e) {setError(e instanceof Error?e.message:'Unable to open tutorial.');}
    finally {setLoading(false);}
  }
  function move(n: number) {if(!tutorial)return;const next=Math.max(0,Math.min(tutorial.steps.length-1,n));if(next===index)return;setAutoPlayStep(next>index?tutorial.steps[next].id:null);setIndex(next);setReplay(0);setSelectedComponent(null);if(instruction.current)instruction.current.scrollTop=0;}
  function replayStep(){setView('model');setReplay(r=>r+1);}
  function shortcuts(e:globalThis.KeyboardEvent){
    if(e.defaultPrevented||e.repeat||e.isComposing||e.ctrlKey||e.metaKey||e.shiftKey)return;
    const target=e.target as HTMLElement;
    if(target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="tab"],[role="slider"],[role="dialog"],dialog'))return;
    if(e.altKey){if(e.key.toLowerCase()==='r'){e.preventDefault();replayStep();}return;}
    if(e.key==='ArrowLeft'){e.preventDefault();move(index-1);}
    if(e.key==='ArrowRight'){e.preventDefault();move(index+1);}
  }
  useEffect(()=>{if(!tutorial||coachActive)return;window.addEventListener('keydown',shortcuts);return()=>window.removeEventListener('keydown',shortcuts);},[tutorial,index,coachActive]);
  function tabKeys(e:KeyboardEvent<HTMLButtonElement>){
    const tabs=['instruction','model','guide'] as const;
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
    e.preventDefault();const i=tabs.indexOf(view);const next=tabs[e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3];setView(next);document.getElementById(`furn-${next}-tab`)?.focus({preventScroll:true});
  }
  function submit(e: FormEvent) {e.preventDefault();void find(query);}
  const doc = tutorial?.product.documents.find(d => d.id===step?.source.document_id);
  if(tutorial&&coachActive)return <Suspense fallback={<p>Opening the coach…</p>}><Coach key={tutorial.product.article_number} tutorial={tutorial} variants={variants} onVariant={p=>void open(p)} variantNotice={variantNotice} preview={new URLSearchParams(location.search).get('coach')==='preview'} onExit={()=>{setTutorial(null);setAutoPlayStep(null);}}/></Suspense>;
  return <div className={`furniture-app ${tutorial?'furn-session':''}`}>
    <header className="furn-header"><a className="furn-brand" href="/ikea"><span className="furn-mark" aria-hidden="true">↗</span><span>Furniture<br/><strong>Assembly Assistant</strong></span></a><a className="furn-project-home" href="/">Project home</a><span className="furn-local">LOCAL EDITION</span></header>
    {!tutorial ? <main className="furn-landing">
      <section className="furn-hero"><div><span className="furn-eyebrow">YOUR NEXT BUILD, STEP BY STEP</span><h1>Make yourself<br/>at home.</h1><p className="furn-intro">A clearer way to put it together. Follow official diagrams, explore a 3D illustration, and take each step at your own pace.</p>
        <form className="furn-search" onSubmit={submit}><label htmlFor="furniture-query">Product name or IKEA article number</label><div><input id="furniture-query" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try LACK or 304.499.08" maxLength={100}/><button disabled={loading} type="submit">{loading?'Finding…':'Find furniture'} <span aria-hidden="true">↗</span></button></div></form><p className="furn-small">LACK · 55 × 55 cm · three supported finishes.</p><a className="furn-demo-link" href="/ikea?product=30449908&action=prepare">Start the guided assembly <span aria-hidden="true">→</span></a>
      </div><div className="furn-hero-art" aria-label="Illustration of a side table, not assembly evidence"><span className="furn-art-caption">THE FIRST BUILD</span><svg className="furn-table-art" viewBox="0 0 300 250" aria-hidden="true"><ellipse cx="155" cy="213" rx="108" ry="19" fill="#8290a3" opacity=".13"/><path d="M146 55h17v111l-17 6z" fill="#cbd2dc"/><path d="M45 102l18 8v100l-18-8zM232 109l18-8v102l-18 8z" fill="#e4e8ef"/><path d="M143 145h18v91l-18-6z" fill="#f8f9fb"/><path d="M161 145l9-4v89l-9 6zM63 110l8-4v99l-8 5zM250 101l8-4v101l-8 5z" fill="#c8d0dc"/><path d="M40 92L151 43l111 49-111 59z" fill="#ffffff"/><path d="M40 92l111 59v13L40 105z" fill="#e7ebf1"/><path d="M151 151l111-59v13l-111 59z" fill="#d6dde7"/></svg><div className="furn-art-bottom"><strong>Small table.<br/>A useful beginning.</strong><span>Illustrative artwork<br/>LACK · 55 × 55 cm</span></div></div></section>
      {loading&&<p role="status">Opening furniture…</p>}{error&&<div className="furn-error" role="alert">{error}<button onClick={()=>failedProduct?void open(failedProduct):void find(query)}>{failedProduct?'Retry guide':'Retry search'}</button>{failedProduct&&<a href={failedProduct.product_url} target="_blank" rel="noreferrer">Official product and instructions ↗</a>}</div>}
      {products!==null&&<section className="furn-results" aria-live="polite"><h2>{products.length?'Your supported furniture':'No supported product found'}</h2>{!products.length?<p>Try LACK or 304.499.08. This edition supports white, black-brown and white stained oak effect LACK side tables, 55 × 55 cm.</p>:products.map(p=><article className="furn-result" key={p.article_number}><div><span className="furn-eyebrow">IKEA · {p.display_article_number}</span><h3>{p.name}</h3><p><span className="finish-swatch" aria-hidden="true" style={{background:p.finish?.base_color}}/> {p.variant}</p><a href={p.product_url} target="_blank" rel="noreferrer">Check your product on IKEA ↗</a></div><div><span className="furn-small">Confirm this matches your furniture.</span><button onClick={()=>void open(p)} disabled={loading}>{loading?'Opening…':'Open assembly guide'} <span aria-hidden="true">→</span></button></div></article>)}</section>}
      <section className="furn-feature-row"><div><span>01</span><h2>Find your furniture</h2><p>Match the article number and variant before you begin.</p></div><div><span>02</span><h2>See what goes where</h2><p>Keep the original instructions beside a schematic 3D view.</p></div><div><span>03</span><h2>Build at your pace</h2><p>Go back, look closer, and pick up where you left off.</p></div></section>
    </main> : step && <main className="furn-workspace">
      <span className="furn-sr-only" role="status" aria-live="polite" aria-atomic="true">Step {index+1} of {tutorial.steps.length}: {step.title}</span>
      <div className="furn-project-bar"><button className="furn-text-button" onClick={()=>{setTutorial(null);setAutoPlayStep(null);setError('');}}>← Furniture</button><div><span className="furn-eyebrow">IKEA · {tutorial.product.display_article_number}</span><h1>{tutorial.product.name} <span>{tutorial.product.variant}</span></h1></div><span className="furn-save">{canSave?'Progress saved on this device':'Progress cannot be saved in this browser'}</span></div>
      <div className="furn-persistent-caution"><strong>Use with care</strong><span>{tutorial.warnings.join(' ')}</span><a href={sourcePdfUrl(tutorial.steps[0].secondary_source??{document_id:null,page_index:null,product_url:tutorial.product.product_url},tutorial.product)} target="_blank" rel="noreferrer">Official warning ↗</a></div>
      <div className="furn-view-tabs" role="tablist" aria-label="Assembly views">{([['instruction','Instructions'],['model','3D illustration'],['guide','Official diagram']] as const).map(([id,label])=><button key={id} role="tab" id={`furn-${id}-tab`} aria-controls={`furn-${id}-panel`} aria-selected={view===id} tabIndex={view===id?0:-1} onKeyDown={tabKeys} onClick={()=>setView(id)}>{label}</button>)}</div>
      <div className="furn-build-grid"><aside ref={instruction} className={`furn-instruction ${view==='instruction'?'is-current':''}`} id="furn-instruction-panel" role="tabpanel" aria-labelledby="furn-instruction-tab" aria-label="Step instructions" tabIndex={0}>
        <div className="furn-step-count">GUIDED STEP {index+1} / {tutorial.steps.length}<span>ASSISTED TUTORIAL</span></div><h2>{step.title}</h2><p className="furn-instruction-copy">{step.instruction}</p>{step.kind==='attach_legs'&&<button className="furn-animation-jump" onClick={()=>setView('model')}>Show full assembly</button>}
        <div className="furn-sequence-note">Explanatory substeps follow the official diagram. They are not printed IKEA step numbers.</div>
        {step.warnings.length>0&&<div className="furn-warning"><strong>Before you continue</strong><ul>{step.warnings.map(w=><li key={w}>{w}</li>)}</ul></div>}
        {step.secondary_source&&<a className="furn-safety-source" href={sourcePdfUrl(step.secondary_source,tutorial.product)} target="_blank" rel="noreferrer">Read the safety source ↗</a>}
        <section className="furn-parts"><h3>For this step</h3>{tutorial.components.filter(c=>step.active_components.includes(c.id)).map(c=><div key={c.id} className="furn-part"><span className="furn-part-count">{c.quantity}×</span><div><button className="furn-part-select" aria-pressed={selectedCategory===c.id} aria-label={`Select ${c.name} in 3D`} onClick={()=>selectComponent(c.id)}>{c.name}<span aria-hidden="true"> ↗</span></button>{c.hardware_id&&<span>Hardware {c.hardware_id}</span>}<p>{c.description}</p></div></div>)}{!step.active_components.length&&<p>No additional components.</p>}</section>
        <p className="furn-model-note">Illustration only. Overall size: 550 × 550 × 450 mm. Leg width, tabletop thickness, and hardware details are schematic. Follow the official diagram for the connection.</p>
        <section className="furn-help"><h3>A little extra guidance</h3>{step.help.map(h=><details key={h.question}><summary>{h.question}</summary><p>{h.answer}</p></details>)}</section>
      {index===tutorial.steps.length-1&&<div className="furn-finish" role="status"><strong>You’ve reached the end of the guide.</strong><p>Revisit any step above. Completing this tutorial does not verify the physical assembly.</p></div>}
      <details className="furn-evidence"><summary>Sources, preparation, and review status</summary><p>This is a PDF-assisted tutorial with schematic illustrations, not automatic reconstruction.</p><ul>{tutorial.warnings.map(w=><li key={w}>{w}</li>)}</ul><p>Agent review: {humanStatus(tutorial.review.agent_review)} · Human review: {humanStatus(tutorial.review.human_review)} · Physical build: {humanStatus(tutorial.review.physical_build)}</p><p>Revision: {tutorial.revision}</p><ul>{tutorial.product.documents.map(d=><li key={d.id}><a href={d.url} target="_blank" rel="noreferrer">{d.title} — {d.id} ↗</a></li>)}</ul><a href={tutorial.product.product_url} target="_blank" rel="noreferrer">Official product and care information ↗</a></details>
      </aside><section className="furn-visuals">

        <div className={`furn-model-panel ${view==='model'?'is-current':''}`} id="furn-model-panel" role="tabpanel" aria-labelledby="furn-model-tab"><div className="furn-panel-heading"><span>{step.kind==='attach_legs'?'BUILD ALL FOUR CONNECTIONS':'THE BIG PICTURE'}</span><span>SCHEMATIC · MILLIMETRES</span></div><IllustrationBoundary><Suspense fallback={<ViewerPlaceholder busy message="Preparing the illustration…"/>}><FurnitureViewport finish={tutorial.product.finish} stepId={step.id} autoPlay={autoPlayStep===step.id} kind={step.kind} activeComponents={step.active_components} replay={replay} selectedComponent={selectedComponent} onSelectComponent={selectComponent} visible={!phone||view==='model'}/></Suspense></IllustrationBoundary></div>
        <div className={`furn-guide-panel ${view==='guide'?'is-current':''}`} id="furn-guide-panel" role="tabpanel" aria-labelledby="furn-guide-tab"><div className="furn-panel-heading"><span>FROM THE OFFICIAL GUIDE</span><a href={sourcePdfUrl(step.source,tutorial.product)} target="_blank" rel="noreferrer">{step.source.document_id?'Open full PDF ↗':'Official care information ↗'}</a></div>{!step.source.document_id?<p>Read the care information on the official product page.</p>:imageError?<div className="furn-error" role="alert">The source image could not load. {doc&&<a href={doc.url} target="_blank" rel="noreferrer">Open the original on IKEA</a>} or <button onClick={()=>setImageError(false)}>retry image</button>.</div>:<a className="furn-diagram-link" href={sourcePdfUrl(step.source,tutorial.product)} target="_blank" rel="noreferrer"><img key={`${step.source.document_id}:${step.source.page_index}`} src={sourceImageUrl(step.source,tutorial.product)} alt={`Official IKEA ${step.source.document_id}, page ${(step.source.page_index??0)+1}. Open the PDF for a larger view.`} onError={()=>setImageError(true)}/></a>}<p className="furn-small">{doc&&<a href={doc.url} target="_blank" rel="noreferrer">Original on IKEA ↗</a>}<br/>{doc?`${doc.title} · Page ${(step.source.page_index??0)+1} · © Inter IKEA Systems B.V.`:'Care reference: official IKEA product page.'}</p></div>
      </section></div>
      <nav className="furn-nav" aria-label="Assembly navigation"><button className="furn-outline" aria-disabled={index===0} aria-keyshortcuts="ArrowLeft" onClick={()=>move(index-1)}>← Previous</button><div className="furn-step-dots">{tutorial.steps.map((s,i)=><button key={s.id} aria-label={`Step ${i+1}: ${s.title}`} aria-current={i===index?'step':undefined} onClick={()=>move(i)}>{i+1}</button>)}</div><button className="furn-outline furn-replay" aria-keyshortcuts="Alt+R" onClick={replayStep}>↻ Replay step</button><button aria-disabled={index===tutorial.steps.length-1} aria-keyshortcuts="ArrowRight" onClick={()=>move(index+1)}>Next step →</button><div className="furn-keyboard-hint"><span>← → Steps · Alt+R Replay · Space Play/pause in viewer</span><button className="furn-shortcuts" onClick={()=>helpDialog.current?.showModal()}>Keyboard help</button></div></nav>
      <dialog ref={helpDialog} className="furn-shortcut-dialog" aria-labelledby="furn-shortcut-title"><h2 id="furn-shortcut-title">Keyboard shortcuts</h2><p>Left / Right arrow: previous / next tutorial step.</p><p>Alt+R: replay the current step and show 3D.</p><p>Space: play or pause when the viewer surface has focus.</p><p>Sliders, tabs, text fields and buttons keep their normal keyboard controls. Tab moves between controls.</p><button onClick={()=>helpDialog.current?.close()}>Close keyboard help</button></dialog>

    </main>}
    <footer className="furn-footer"><span>Built for a clearer next step.</span><span>Independent local assistant. Not affiliated with IKEA. Official documents remain the assembly reference.</span></footer>
  </div>;
}
