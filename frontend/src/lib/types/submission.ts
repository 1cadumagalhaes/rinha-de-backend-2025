
export type SubmissionRecord = {
  submission_id: string;
  source_code_repo: string;
  commits_count?: number | null;
  first_commit?: string | null;
  last_commit?: string | null
  rank: number;
  performance_rank: number;
  user: {
    name: string;
    socials?: string[];
    github?: string;
    github_profile_pic?: string | null;
    num_submissions?: number;
  };
  tech_stack?: {
    languages?: string[];
    runtimes?: string[];
    storages?: string[];
    messaging?: string[];
    load_balancers?: string[];
    others?: string[];
    tags?: string[];
  };
  results?: {
    financeiro: {
      total_liquido: number;
      total_bruto: number;
      total_taxas: number;
      multa_total: number;
      multa_porcentagem: number;
      bonus: number;
      caixa_dois: boolean;
    };
    performance: {
      p99: number;
      max_requests: number;
      num_pagamentos_solicitados: number;
      lag: number;
      num_pagamentos_falha: number;
      num_inconsistencias: number;
    };
    pagamentos: {
      default_total_bruto: number;
      default_num_pagamentos: number;
      default_total_taxas: number;
      fallback_total_bruto: number;
      fallback_total_taxas: number;
      fallback_num_pagamentos: number;
    };
  };
};
