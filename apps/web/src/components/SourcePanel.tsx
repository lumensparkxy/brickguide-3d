import { useEffect, useRef, useState } from 'react';
import type { SourcePanel as Panel } from '../contracts';
export default function SourcePanel({ panel, officialOnly=false, officialUrl, bookletLabel }: {panel: Panel; officialOnly?:boolean; officialUrl?:string; bookletLabel?:string}) {
  const canvas = useRef<HTMLCanvasElement>(null); const [error, setError] = useState(''); const [ready, setReady] = useState(false);
  const url = `/api/v1/sources/${panel.source_sha256}/pages/${panel.page_index}`;
  useEffect(() => {
    if(officialOnly)return;
    let stopped = false; const img = new Image(); setReady(false); setError('');
    img.onload = () => {
      if (stopped || !canvas.current) return;
      const [x0,y0,x1,y1] = panel.bbox;
      const left = Math.floor(x0*img.width), top = Math.floor(y0*img.height);
      const width = Math.min(img.width, Math.ceil(x1*img.width))-left;
      const height = Math.min(img.height, Math.ceil(y1*img.height))-top;
      canvas.current.width = width; canvas.current.height = height;
      canvas.current.getContext('2d')?.drawImage(img,left,top,width,height,0,0,width,height); canvas.current.dataset.panel = JSON.stringify(panel); setReady(true);
    };
    img.onerror = () => { if (!stopped) setError('The local source page could not be loaded. Re-run source preparation to restore it.'); };
    img.src = url; return () => { stopped = true; img.onload = null; img.onerror = null; };
  }, [panel, url, officialOnly]);
  if(officialOnly)return <div className="official-source-reference"><p>{bookletLabel} · PDF page {panel.page_index+1}</p><p>Keep your official booklet beside you as you build.</p><a className="source-link" href={`${officialUrl}#page=${panel.page_index+1}`} target="_blank" rel="noreferrer">Open official booklet ↗</a></div>;
  return <><div className="source-crop">{!ready && !error && <p role="status">Loading source panel…</p>}
    {error && <p role="alert">{error}</p>}<canvas hidden={!ready} ref={canvas} role="img" aria-label={`Official instruction crop from PDF page ${panel.page_index+1}`}/></div>
    <a className="source-link" href={url} target="_blank" rel="noreferrer">Open full-size page {panel.page_index+1} ↗</a></>;
}
