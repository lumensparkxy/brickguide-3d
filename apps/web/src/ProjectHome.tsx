import {useEffect} from 'react';
import './projectHome.css';

function Header(){return <header className="project-header"><a className="project-brand" href="/" aria-label="Guide2Build project home">Guide2Build<span>3D</span></a><nav aria-label="Project navigation"><a href="/#how-it-works">How it works</a><a href="/lego">LEGO</a><a href="/ikea">IKEA</a></nav></header>;}
function Footer(){return <footer className="project-footer"><a className="project-brand" href="/">Guide2Build<span>3D</span></a><p>Independent project. Not affiliated with or endorsed by IKEA or the LEGO Group.<br/>Official instructions remain the assembly reference.</p><a href="#top">Back to top ↑</a></footer>;}
const pipeline=[
 ['01','Official sources','Start with the selected product and its official instructions. Keep document identities and source references.'],
 ['02','Bounded preparation','Retrieve allowlisted documents, cache their bytes, record hashes, and prepare source pages.'],
 ['03','Authored assembly','Translate the diagrams into explicit components and actions. Review the sequence and retain uncertainty.'],
 ['04','Interactive guidance','Render deterministic Three.js views. Keep the instruction, part labels and current action together.'],
];
export default function ProjectHome(){
 useEffect(()=>{const old=document.title;document.title='Guide2Build — From instructions to interactive assembly';return()=>{document.title=old;};},[]);
 return <div className="project-home" id="top">
  <a className="project-skip" href="#project-main">Skip to content</a>
  <Header/>
  <main id="project-main">
   <section className="project-hero" aria-labelledby="project-title">
    <div><p className="project-kicker">A PROJECT IN INTERACTIVE ASSEMBLY</p><h1 id="project-title">From instruction booklets<br/> to <span>interactive assembly.</span></h1><p className="project-lead">We started with LEGO. Then we took the same question to furniture: can a diagram become a clearer next action?</p><div className="project-hero-links"><a className="project-button" href="#experiences">Explore the demos <span aria-hidden="true">↗</span></a><a className="project-text-link" href="#how-it-works">See how we built it <span aria-hidden="true">↓</span></a></div></div>
    <aside className="project-principle"><span className="project-principle-number" aria-hidden="true">↳</span><p>Keep the source.<br/>Make the action visible.<br/><strong>Let the builder stay in control.</strong></p><span>Source-linked diagrams · 3D animation · voice guidance</span></aside>
   </section>

   <section className="project-experiences project-section" id="experiences" aria-labelledby="experiences-title">
    <div className="project-section-heading"><div><p className="project-kicker">TWO EXPERIENCES, ONE IDEA</p><h2 id="experiences-title">Explore what we built.</h2></div><p>Working local experiences, with their sources and limitations kept visible.</p></div>
    <div className="project-demo-grid">
     <article className="project-demo"><a className="project-demo-image" href="/ikea" tabIndex={-1} aria-hidden="true"><img src="/images/project/ikea.webp" width="1440" height="900" alt="" loading="lazy"/></a><div className="project-demo-copy"><div className="project-demo-title"><span className="project-demo-kind">01 / FURNITURE</span><span className="project-demo-tag">Guided coach</span></div><h3>IKEA assembly assistant</h3><p>Build a LACK side table one action at a time. Follow labelled parts and screw-and-leg animations, choose your finish, or use the Gemini voice coach hands-free.</p><p className="project-demo-scope">LACK 55 × 55 cm · three Swiss catalogue finishes<br/>Authored tutorial · human and physical validation pending</p><a className="project-demo-link" href="/ikea">Open IKEA experience <span aria-hidden="true">↗</span></a></div></article>
     <article className="project-demo"><a className="project-demo-image" href="/lego" tabIndex={-1} aria-hidden="true"><img src="/images/project/lego.webp" width="1440" height="900" alt="" loading="lazy"/></a><div className="project-demo-copy"><div className="project-demo-title"><span className="project-demo-kind">02 / BRICKS</span><span className="project-demo-tag">Assembly explorer</span></div><h3>LEGO instruction explorer</h3><p>Explore supported booklets and available 3D candidates alongside their official instructions. Inspect parts, move between steps, and replay the assembly view.</p><p className="project-demo-scope">Curated booklets · available candidates vary by set<br/>Alpha geometry and placements remain unverified</p><a className="project-demo-link" href="/lego">Open LEGO experience <span aria-hidden="true">↗</span></a></div></article>
    </div><p className="project-image-note">Screenshots from the local interfaces. 3D views are instructional representations, not evidence of a verified physical build.</p>
   </section>

   <section className="project-architecture project-section" id="how-it-works" aria-labelledby="architecture-title">
    <div className="project-section-heading"><div><p className="project-kicker">HOW IT WORKS</p><h2 id="architecture-title">A traceable path from source to screen.</h2></div><p>React and TypeScript provide the workspace. FastAPI handles local source access. Three.js makes each action explorable.</p></div>
    <ol className="project-pipeline" aria-label="Source-to-viewer architecture">{pipeline.map(([number,title,description])=><li key={number}><span className="project-pipeline-number">{number}</span><h3>{title}</h3><p>{description}</p></li>)}</ol>
    <div className="project-voice-lane"><div><span className="project-voice-icon" aria-hidden="true">◉</span><h3>A voice layer for IKEA</h3></div><p>Gemini receives the selected article, current action, authored guidance and portal state. Scoped controls navigate, replay and record explicit user confirmations. Finishing an animation never marks physical work complete.</p></div>
    <p className="project-architecture-note">The current tutorials use assisted authoring and deterministic playback. This is not a general automatic PDF-to-3D converter.</p>
   </section>

   <section className="project-section" aria-labelledby="journey-title">
    <div className="project-section-heading"><div><p className="project-kicker">HOW WE GOT HERE</p><h2 id="journey-title">From an experiment to a practical coach.</h2></div><p>Each iteration changed what we chose to make explicit.</p></div>
    <ol className="project-journey"><li><span>01</span><h3>Start with LEGO</h3><p>Explore official booklets, individual part geometry and interactive assembly states. Learn where a plausible view can hide uncertain placement.</p></li><li><span>02</span><h3>Make the next action clear</h3><p>Apply those lessons to one bounded furniture pilot: a LACK table, labelled components, and a complete sequence of screw-and-leg actions.</p></li><li><span>03</span><h3>Support the person building</h3><p>Add stable controls, saved progress, real finish variants and a voice coach that explains, waits for “done”, then moves on.</p></li></ol>
   </section>

   <section className="project-lessons project-section" aria-labelledby="lessons-title"><div><p className="project-kicker">WHAT WE LEARNED</p><h2 id="lessons-title">A convincing animation<br/>is only part of the work.</h2></div><div className="project-lesson-list"><article><h3>Software correctness is not assembly accuracy.</h3><p>Tests can verify navigation, playback and contracts. Source review and physical assembly answer different questions.</p></article><article><h3>The original diagram must stay within reach.</h3><p>A missing measurement or uncertain connection remains visible. We do not invent torque, insertion depth or hidden geometry.</p></article><article><h3>Progress belongs to the builder.</h3><p>Viewing a step, finishing an animation and confirming physical work are separate events. Voice follows the same rule.</p></article></div></section>

   <section className="project-section project-status" aria-labelledby="status-title"><div className="project-section-heading"><div><p className="project-kicker">WHERE THE PROJECT STANDS</p><h2 id="status-title">Working software. Clear boundaries.</h2></div><p>A local prototype with explicit validation gates, not a production-readiness claim.</p></div><dl className="project-status-list"><div><dt>Software validation</dt><dd><strong>Tested locally</strong><span>Automated checks and browser inspection cover supported portal behaviour.</span></dd></div><div><dt>Source review</dt><dd><strong>Agent-checked IKEA pilot</strong><span>Official diagrams and article-specific sources are retained. LEGO alpha placement accuracy remains unverified.</span></dd></div><div><dt>Human review & physical assembly</dt><dd><strong>Not run</strong><span>Observed assembly and real-device accessibility validation remain separate next gates.</span></dd></div></dl><p className="project-next">Next: observe first-time builders using the actual supported furniture, record confusion and mistakes, then revise the guide.</p></section>
  </main><Footer/>
 </div>;
}
export function NotFound(){
 useEffect(()=>{document.title='Page not found — Guide2Build';},[]);
 return <div className="project-home" id="top"><Header/><main className="project-not-found"><p className="project-kicker">404 / PAGE NOT FOUND</p><h1>Page not found.</h1><p>Choose the project overview or one of the supported assembly experiences.</p><nav aria-label="Available pages"><a className="project-button" href="/">Project home</a><a className="project-text-link" href="/ikea">IKEA experience ↗</a><a className="project-text-link" href="/lego">LEGO experience ↗</a></nav></main><Footer/></div>;
}
