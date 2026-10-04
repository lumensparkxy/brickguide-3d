import type { SetInfo } from './contracts';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export async function request<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body?.detail?.code ?? 'request_failed', body?.detail?.message ?? 'The request could not be completed.');
  return body as T;
}
export function post<T = unknown>(path: string, body?: unknown, key?: string): Promise<T> {
  return request<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
}
export interface ConversionJob { job_id: string; state: string; stage: string; completed_units: number; total_units: number | null; attempts: number; output_revision: string | null; source_sha256: string | null; error: string | {message?: string; code?: string} | null; }
export interface GuideStatus { source_available: boolean; latest_candidate_revision: string | null; latest_reviewed_revision: string | null; job: ConversionJob | null; coverage: unknown; }
export interface ImageQuality {
  profile: 'strict' | 'alpha';
  max_rms_pixels: number;
  max_point_pixels: number;
  strict_max_rms_pixels: number;
  relaxed_steps: {step_id: string; rms_pixels: number; max_error_pixels: number}[];
}
export interface EnginePreview {
  job_id: string; set_number: string; guide_id: string; set_name?: string;
  state: string; stage: string; revision: string | null; experiment_revision: string | null;
  completed_panels: number; total_panels: number | null; instance_count: number; step_count: number;
  main_step_count?: number; candidate_available: boolean; candidate_message: string | null;
  image_quality?: ImageQuality; generation_mode?: 'standard' | 'alpha_fast';
  completed_pages?: number; page_count?: number | null; source_coverage?: unknown;
  uncertainty_notes?: string[]; camera_alignment_check?: 'not_run' | 'measured_per_instruction';
  uncertainty_details?: unknown[]; artifact_kind?: string;
  repair?: {panel: number; attempt: number; limit: number}; error: {code?: string; message?: string} | null;
}

export function parseEnginePreviews(value: unknown): EnginePreview[] {
  const collection = value && typeof value === 'object' && 'candidates' in value
    ? (value as {candidates: unknown}).candidates : [value];
  const count = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;
  const nullableText = (text: unknown) => text === null || typeof text === 'string';
  if (!Array.isArray(collection) || collection.length < 1 || collection.length > 100) throw new Error('Invalid engine preview status received.');
  const identities = new Set<string>();
  return collection.map(value => {
    const preview = value as EnginePreview;
    if (!preview || typeof preview.job_id !== 'string' || !/^[a-f0-9]{32}$/.test(preview.job_id)
        || typeof preview.set_number !== 'string' || !/^\d{4,7}$/.test(preview.set_number)
        || typeof preview.guide_id !== 'string' || !/^[a-z0-9-]+$/.test(preview.guide_id) || typeof preview.state !== 'string'
        || typeof preview.stage !== 'string' || !nullableText(preview.revision) || !nullableText(preview.experiment_revision)
        || !count(preview.completed_panels) || !(preview.total_panels === null || count(preview.total_panels))
        || !count(preview.step_count) || !count(preview.instance_count) || typeof preview.candidate_available !== 'boolean'
        || !nullableText(preview.candidate_message) || !(preview.error === null || typeof preview.error === 'object'
          && !Array.isArray(preview.error) && (preview.error.code === undefined || typeof preview.error.code === 'string')
          && (preview.error.message === undefined || typeof preview.error.message === 'string'))
        || (preview.generation_mode !== undefined && !['standard','alpha_fast'].includes(preview.generation_mode))
        || (preview.completed_pages !== undefined && !count(preview.completed_pages))
        || (preview.page_count !== undefined && preview.page_count !== null && !count(preview.page_count))
        || (preview.artifact_kind !== undefined && typeof preview.artifact_kind !== 'string')
        || (preview.uncertainty_details !== undefined && !Array.isArray(preview.uncertainty_details))
        || (preview.uncertainty_notes !== undefined && (!Array.isArray(preview.uncertainty_notes)
          || preview.uncertainty_notes.some(note => typeof note !== 'string')))) throw new Error('Invalid engine preview status received.');
    const identity = `${preview.set_number}:${preview.guide_id}`;
    if (identities.has(identity)) throw new Error('Duplicate engine preview guide received.');
    identities.add(identity);
    return {...preview, ...(preview.image_quality ? {image_quality: parseImageQuality(preview.image_quality)} : {})};
  });
}

export function previewForGuide(previews: EnginePreview[], setNumber: string, guideId: string, revision?: string): EnginePreview | undefined {
  return previews.find(preview => preview.set_number === setNumber && preview.guide_id === guideId
    && (revision === undefined || preview.revision === revision));
}

export function withPreviewAvailability(info: SetInfo, previews: EnginePreview[]): SetInfo {
  return {...info, guides: info.guides.map(guide => ({...guide,
    tutorial_available: previewForGuide(previews,info.set_number,guide.guide_id)?.candidate_available ?? guide.tutorial_available}))};
}

export function previewCoverageText(preview: EnginePreview): string {
  const coverage = preview.generation_mode === 'alpha_fast'
    ? `${preview.completed_pages ?? 0} of ${preview.page_count ?? 'unknown'} source pages processed`
    : `${preview.completed_panels} of ${preview.total_panels ?? 'unknown'} source panels`;
  return `${coverage} · ${preview.step_count} candidate instructions · ${preview.instance_count} physical pieces`;
}
export function parseImageQuality(value: unknown): ImageQuality {
  const quality = value as ImageQuality;
  const bounded = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= 100;
  if (!quality || !['strict','alpha'].includes(quality.profile) || !bounded(quality.max_rms_pixels)
      || !bounded(quality.max_point_pixels) || !bounded(quality.strict_max_rms_pixels)
      || !Array.isArray(quality.relaxed_steps) || quality.relaxed_steps.some(step => !step
        || typeof step.step_id !== 'string' || !bounded(step.rms_pixels) || !bounded(step.max_error_pixels))) {
    throw new Error('Invalid image-quality status received.');
  }
  return quality;
}
export function parseJob(value: unknown): ConversionJob {
  const job = value as ConversionJob;
  const states = ['queued','running','fetching','rendering','extracting','mapping_parts','solving_poses','validating','needs_review','ready','failed','cancelled'];
  if (!job || typeof job.job_id !== 'string' || !job.job_id || typeof job.stage !== 'string' || !states.includes(job.state) || !Number.isInteger(job.completed_units) || job.completed_units < 0 || !Number.isInteger(job.attempts) || job.attempts < 0 || !(job.total_units === null || Number.isInteger(job.total_units) && job.total_units >= 0) || !(job.output_revision === null || typeof job.output_revision === 'string') || !(job.source_sha256 === null || typeof job.source_sha256 === 'string' && /^[a-f0-9]{64}$/.test(job.source_sha256)) || !(job.error === null || typeof job.error === 'string' || typeof job.error === 'object' && typeof job.error.message === 'string' && typeof job.error.code === 'string')) throw new Error('Invalid processing status received.');
  return job;
}

export function parseGuideStatus(value: unknown): GuideStatus {
  const status = value as GuideStatus;
  if (!status || typeof status.source_available !== 'boolean' || !(status.latest_candidate_revision === null || typeof status.latest_candidate_revision === 'string') || !(status.latest_reviewed_revision === null || typeof status.latest_reviewed_revision === 'string') || !('job' in status)) throw new Error('Invalid guide status received.');
  if (status.job !== null) status.job = parseJob(status.job); return status;
}
