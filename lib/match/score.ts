export interface ConceptWeight {
  label: string;
  weight: number;
}

export interface QuestionInput {
  id: string;
  concepts: ConceptWeight[];
}

export interface ScoreInput {
  questions: QuestionInput[];
  teamConcepts: ConceptWeight[];
}

export interface PerQuestionScore {
  questionId: string;
  score: number;
}

export interface ScoreResult {
  baseScore: number; // 0-100
  perQuestion: PerQuestionScore[];
}

export function conceptVector(items: ConceptWeight[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const item of items) {
    const key = item.label.toLowerCase().trim();
    m.set(key, (m.get(key) ?? 0) + item.weight);
  }
  return m;
}

export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const v of a.values()) normA += v * v;
  for (const v of b.values()) normB += v * v;
  for (const [k, v] of a) {
    const bv = b.get(k);
    if (bv) dot += v * bv;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

export function scoreMatch(input: ScoreInput): ScoreResult {
  const teamVec = conceptVector(input.teamConcepts);
  const perQuestion: PerQuestionScore[] = [];
  let total = 0;
  for (const q of input.questions) {
    const qVec = conceptVector(q.concepts);
    const score = Math.round(cosine(qVec, teamVec) * 100);
    perQuestion.push({ questionId: q.id, score });
    total += score;
  }
  const baseScore = input.questions.length === 0 ? 0 : Math.round(total / input.questions.length);
  return { baseScore, perQuestion };
}
