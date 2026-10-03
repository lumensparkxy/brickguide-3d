import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, parseGuideStatus, parseJob, post, request, type ConversionJob } from './api';
import { parseScene, parseSet } from './validation';
import type { Guide, SceneManifest, SetInfo } from './contracts';
import LandingPage from './components/LandingPage';
import BookletDialog from './components/BookletDialog';
const ViewerWorkspace = lazy(() => import('./components/ViewerWorkspace'));
const terminal = new Set(['ready', 'needs_review', 'failed', 'cancelled']);
export default function App() {
  const [setNumber, setSetNumber] = useState('30669');
  const [bookletOpen,setBookletOpen] = useState(false);
  const [setInfo, setSetInfo] = useState<SetInfo | null>(null);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [scene, setScene] = useState<SceneManifest | null>(null);
  const [job, setJob] = useState<ConversionJob | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [notice, setNotice] = useState(''); const operation = useRef(0); const conversionKeys = useRef<Record<string,string>>({});
  const returnToLookup = useRef(false);
  const focusPreparation = useRef(false);
  const resultHeading = useRef<HTMLHeadingElement>(null); const errorHeading = useRef<HTMLHeadingElement>(null); const preparationHeading = useRef<HTMLHeadingElement>(null); const focusResult = useRef(false);
  const base = setInfo && guide ? `/sets/${setInfo.set_number}/guides/${guide.guide_id}` : '';
  useEffect(()=>{if(!bookletOpen&&!busy&&returnToLookup.current){document.getElementById('find-set')?.focus();returnToLookup.current=false;}},[bookletOpen,busy]);
  useEffect(()=>{
    if(scene){window.scrollTo(0,0);focusResult.current=false;return;}
    if(!busy&&focusResult.current){const target=error?errorHeading.current:resultHeading.current;if(target){target.focus();focusResult.current=false;}}
  },[scene,busy,setInfo,error]);
  useEffect(()=>{
    if (!busy && guide && focusPreparation.current) {
      preparationHeading.current?.focus(); preparationHeading.current?.scrollIntoView({block:'start'});
      focusPreparation.current=false;
    }
  },[busy,guide]);
  useEffect(() => {
    if (!job || terminal.has(job.state)) return;
    let stopped = false; let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { const result = parseJob(await request(`/jobs/${job.job_id}`)); if (!stopped) { setJob(result); if (!terminal.has(result.state)) timer = setTimeout(poll, 1200); } }
      catch (e) { if (!stopped) { setError(e instanceof Error ? e.message : 'Processing status unavailable.'); timer = setTimeout(poll, 4000); } }
    };
    timer = setTimeout(poll, 500); return () => { stopped = true; clearTimeout(timer); };
  }, [job?.job_id, job?.state]);
  async function findSet(event: FormEvent) { event.preventDefault(); await lookupSet(setNumber); }
  async function lookupSet(value:string, tryExample=false) {
    const op = ++operation.current; focusResult.current=true;
    setBookletOpen(false); setError(''); setNotice(''); setScene(null); setGuide(null); setSetInfo(null); setJob(null);
    if (!/^\d{4,7}$/.test(value.trim())) { setError('Enter a set number containing 4–7 digits.'); return; }
    setBusy(true);
    try {
      const result = parseSet(await request(`/sets/${encodeURIComponent(value.trim())}`));
      if (op === operation.current) {
        setSetInfo(result); setBookletOpen(true);
        if(tryExample){const example=result.guides.find(item=>item.guide_id==='alt-02');if(!example)throw new Error('The supported alternate booklet is not available. Choose an available booklet below.');await openGuide(example,result);}
      }
    }
    catch (e) { if(op===operation.current)setError(e instanceof Error ? e.message : 'The set could not be found.'); }
    finally { if(op===operation.current)setBusy(false); }
  }
  async function loadRevision(revision: string) { const op=operation.current;try{const candidate=parseScene(await request(`/reconstructions/${encodeURIComponent(revision)}/scene`));if(op===operation.current){setScene(candidate);setNotice('Loaded a cached reconstruction revision.');}}catch(e){if(op===operation.current)throw e;} }
  async function openPreparation(selected: Guide) {
    if (!setInfo) return;
    const op = operation.current;
    focusPreparation.current=true;
    setGuide(selected); setJob(null); setError(''); setNotice(''); setBusy(true);
    try {
      const status = parseGuideStatus(await request(`/sets/${setInfo.set_number}/guides/${selected.guide_id}/status`));
      if (op !== operation.current) return;
      if (status.job) setJob(parseJob(status.job));
      else await prepare('assisted', selected);
    } catch (e) { if(op === operation.current) setError(e instanceof Error ? e.message : 'Booklet preparation could not be opened.'); }
    finally { if(op === operation.current) setBusy(false); }
  }
  async function openGuide(selected: Guide, selectedSet: SetInfo | null = setInfo) {
    if (!selectedSet) return; const op=operation.current; focusResult.current=true; setGuide(selected); setBusy(true); setError(''); setNotice(''); setJob(null);
    const path = `/sets/${selectedSet.set_number}/guides/${selected.guide_id}`;
    try { const candidate=parseScene(await request(`${path}/scene`));if(op===operation.current){setScene(candidate);setNotice('Loaded a cached reconstruction revision.');} }
    catch (e) {
      if(op!==operation.current)return;
      setError(e instanceof Error ? e.message : 'The tutorial could not be opened.');
      if (e instanceof ApiError && e.status === 409) {
        try { const status = parseGuideStatus(await request(`${path}/status`)); if(op!==operation.current)return; if (status.job) setJob(parseJob(status.job)); if (status.latest_candidate_revision) { await loadRevision(status.latest_candidate_revision); if(op===operation.current)setError(''); } else if (!selected.tutorial_available) { setError(''); setNotice('No 3D reconstruction is available for this booklet yet.'); } }
        catch { /* Original not-ready error remains actionable; preparation is available below. */ }
      }
    } finally { if(op===operation.current)setBusy(false); }
  }
  async function prepare(mode: 'assisted' | 'automated', selected: Guide | null = guide) {
    if (!setInfo || !selected) return; const op=operation.current; setBusy(true); setError('');
    const identity = `${setInfo.set_number}:${selected.guide_id}:${mode}`;
    const idempotencyKey = conversionKeys.current[identity] ??= crypto.randomUUID();
    try { const result=parseJob(await post('/conversions', { set_number: setInfo.set_number, guide_id: selected.guide_id, mode }, idempotencyKey));delete conversionKeys.current[identity];if(op===operation.current){setJob(result);setNotice('Preparation is recorded locally. You can reopen this booklet to resume.');} }
    catch (e) { if(op===operation.current)setError(e instanceof Error ? e.message : 'Preparation failed.'); } finally { if(op===operation.current)setBusy(false); }
  }
  async function jobAction(action: 'cancel' | 'retry') {
    if (!job) return; const op=operation.current; setBusy(true); setError('');
    try { const result=parseJob(await post(`/jobs/${job.job_id}/${action}`));if(op===operation.current)setJob(result); }
    catch (e) { if(op===operation.current)setError(e instanceof Error ? e.message : 'Job action failed.'); } finally { if(op===operation.current)setBusy(false); }
  }
  const closeBooklet=()=>{++operation.current;returnToLookup.current=true;setBusy(false);setBookletOpen(false);setJob(null);setError('');focusResult.current=false;};
  return scene && guide ? <main className="studio-main"><Suspense fallback={<p role="status">Loading the 3D viewer…</p>}>
      <ViewerWorkspace key={scene.revision} scene={scene} guide={guide} onScene={setScene} onClose={() => {focusResult.current=true;setBookletOpen(true);setScene(null);}} />
    </Suspense></main> : <LandingPage setNumber={setNumber} onSetNumber={setSetNumber} onFind={findSet} onTry={()=>{setSetNumber('30669');void lookupSet('30669',true);}} busy={busy}>
      {!setInfo&&error&&<div className="landing-workflow"><div role="alert" className="notice"><h2 ref={errorHeading} tabIndex={-1}>Set lookup</h2><p>{error}</p></div></div>}
      {setInfo&&bookletOpen&&<BookletDialog onClose={closeBooklet}>
      {setInfo && <section className="set-result" aria-label="Set details"><div className="booklet-heading"><span className="eyebrow">LET’S BUILD SOMETHING</span><h2 id="booklet-title" ref={resultHeading} tabIndex={-1}>{setInfo.set_number} · {setInfo.name}</h2><p>Official source found. Choose your booklet to get started.</p></div><div className="booklet-options">
        {setInfo.guides.map(item => <div className="guide-row" key={item.guide_id}><div><span className="booklet-tag">{item.tutorial_available ? '3D CANDIDATE AVAILABLE' : 'OFFICIAL SOURCE · NO 3D TUTORIAL YET'}</span><strong>{item.label}</strong><p className="muted">{item.expected_main_steps == null ? 'Instruction count has not been verified.' : `Booklet: ${item.expected_main_steps} main steps`}</p></div><button disabled={busy} onClick={() => item.tutorial_available ? openGuide(item) : openPreparation(item)}>{item.tutorial_available ? 'Open tutorial' : 'Prepare booklet'}</button></div>)}
        <a href={setInfo.official_page} target="_blank" rel="noreferrer">View official instructions ↗</a></div></section>}
      {error && <div role="alert" className="notice"><h2 ref={errorHeading} tabIndex={-1}>{guide ? 'Preparation needs attention' : 'Set lookup'}</h2><p>{error}</p></div>}
      {guide && <section className="preparation" aria-label="Booklet preparation"><h2 ref={preparationHeading} tabIndex={-1}>{guide.label}</h2>
        <p>Preparation downloads and renders this official booklet. A 3D tutorial needs a separate reconstruction and review.</p>
        {notice && <p className="muted">{notice}</p>}
        {job && <div className="job-state" role="status"><strong>{job.state === 'needs_review' && !job.output_revision ? 'Booklet prepared' : job.state.replaceAll('_', ' ')}</strong><p>Stage: {job.stage.replaceAll('_', ' ')}</p>
          {job.total_units != null && job.total_units > 0 && <><progress aria-label="Booklet preparation progress" value={job.completed_units} max={job.total_units}/><p>{job.completed_units} of {job.total_units} {job.stage === 'rendering' ? 'pages rendered' : ['validating','needs_review','ready'].includes(job.stage) ? 'pages prepared' : 'units'}</p></>}
          {job.error && !(typeof job.error === 'object' && job.error.code === 'assisted_reference_unavailable') && <p>{typeof job.error === 'string' ? job.error : job.error.message ?? job.error.code}</p>}
          {job.state === 'needs_review' && <p>{job.output_revision ? 'Unresolved part identities and placements require evidence-backed review.' : 'The official pages are prepared. No 3D reconstruction is available for this booklet yet.'}</p>}
          <div className="button-row">{!terminal.has(job.state) && <button className="secondary" disabled={busy} onClick={() => jobAction('cancel')}>Cancel preparation</button>}
          {['failed','cancelled'].includes(job.state) && <button disabled={busy} onClick={() => jobAction('retry')}>Retry preparation</button>}
          {job.output_revision && <button onClick={() => loadRevision(job.output_revision!).catch(e => setError(e.message))}>Open candidate for review</button>}</div>
        </div>}
        {(!job || ['failed','cancelled'].includes(job.state)) && <div className="button-row"><button disabled={busy} onClick={() => prepare('assisted')}>Prepare official booklet</button><button className="secondary" disabled={busy} onClick={() => prepare('automated')}>Try automatic conversion</button></div>}
        <p><a href={guide.pdf_url} target="_blank" rel="noreferrer">Open the original booklet ↗</a></p>
        {base && <button className="secondary" disabled={busy} onClick={() => openGuide(guide)}>Check for a reconstruction</button>}
      </section>}
      </BookletDialog>}
    </LandingPage>;
}
