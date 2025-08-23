export type Top3PerLanguageMap = Record<string, string[]>;

export type ParticipantMostSubmissions = {
  name: string;
  submissions: string[];
  github?: string;
};

export type Highlights = {
  total_participants?: number;
  total_submissions?: number;
  most_used_language?: string;
  most_used_storage?: string;
  language_distribution?: Record<string, number>;
  runtime_distribution?: Record<string, number>;
  // map date -> count
  submissions_per_day?: Record<string, number>;
  first_submission?: { submission_id?: string; date?: string } | null;
  last_submission?: { submission_id?: string; date?: string } | null;

  top3_total_liquido?: string[];
  top3_total_liquido_per_language?: Record<string, string[]>;

  top3_p99?: string[];
  top3_p99_per_language?: Record<string, string[]>;

  top3_p99_liquido?: string[];
  top3_p99_per_language_liquido?: Record<string, string[]>;

  top3_participants_most_submissions?: ParticipantMostSubmissions[];

  // allow other miscellaneous fields
  [key: string]: any;
};