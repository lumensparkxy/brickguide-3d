import React from 'react';
import ReactDOM from 'react-dom/client';
import ProjectHome, {NotFound} from './ProjectHome';
const LegoApp = React.lazy(() => import('./App'));
const FurnitureApp = React.lazy(() => import('./furniture/FurnitureApp'));
const path = window.location.pathname.replace(/\/$/, '') || '/';
const content = path === '/' ? <ProjectHome /> : path === '/ikea' ? <FurnitureApp /> : path === '/lego' ? <LegoApp /> : <NotFound />;
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><React.Suspense fallback={<p role="status">Opening assembly experience…</p>}>{content}</React.Suspense></React.StrictMode>);
