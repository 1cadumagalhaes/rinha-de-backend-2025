import submissionsJson from '$lib/data/submissions.json';
import type { SubmissionRecord } from '$lib/types/submission';
// submissions.json may be an array at root or an object with `submissions`.
const raw: any = submissionsJson as any;
const all: SubmissionRecord[] = Array.isArray(raw) ? raw : raw.submissions || [];


export function getAll(): SubmissionRecord[] {
  return all;
}

export function getByParticipant(participant: string): SubmissionRecord | null {
  if (!participant) return null;
  // support lookup by submission_id, participant, user.github or user.name
  return (
    all.find(
      (s) =>
        (s.submission_id && s.submission_id === participant)
    ) || null
  );
}

export function search(filters: { language?: string; runtime?: string; storage?: string; q?: string } = {}) {
  return all.filter((s) => {
    if (filters.language) {
      const langs = s.tech_stack?.languages ?? [];
      if (!langs.includes(filters.language.toLowerCase())) return false;
    }
    if (filters.runtime) {
      const runtimes = s.tech_stack?.runtimes ?? [];
      if (!runtimes.includes(filters.runtime.toLowerCase())) return false;
    }
    if (filters.storage) {
      const storages = s.tech_stack?.storages ?? [];
      if (!storages.includes(filters.storage.toLowerCase())) return false;
    }
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const name_or_user_or_submission = [s.user?.name, s.submission_id, s.source_code_repo,].join(' ').toLowerCase();
      if (!name_or_user_or_submission.includes(q)) return false;
    }
    return true;
  });
}

export default { getAll, getByParticipant, search };
