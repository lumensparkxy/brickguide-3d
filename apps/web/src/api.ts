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
