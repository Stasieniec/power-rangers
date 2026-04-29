// Trimmed shapes — only what we use.

export interface OAConcept {
  id: string;
  display_name: string;
  level: number;
  score: number;
}

export interface OAAuthor {
  id: string;
  display_name: string;
  orcid: string | null;
  works_count: number;
  cited_by_count: number;
  last_known_institution?: { display_name: string | null } | null;
  x_concepts: OAConcept[];
}

export interface OAWork {
  id: string;
  title: string | null;
  display_name: string | null;
  publication_year: number | null;
  cited_by_count: number;
  doi: string | null;
  abstract_inverted_index: Record<string, number[]> | null;
  primary_location?: { source?: { display_name: string | null } | null } | null;
}

export interface OAAuthorsResponse {
  results: OAAuthor[];
}

export interface OAWorksResponse {
  results: OAWork[];
}
