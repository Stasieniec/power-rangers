// Three reports on project P2 (in_progress with BioFlux Lab) — written in
// believable researcher voice, with explicit references to research questions.

export const REPORTS = [
  {
    id: "report_w1",
    projectId: "project_p2",
    teamId: "team_bioflux",
    submittedByUserId: "user_frank",
    weekOf: "2026-04-08",
    rawMarkdown: `## Week 1 (2026-04-08)

### What we did this week
- Pulled the de-identified enrollment cohort (n=4,812) covering 2024-Q3 through 2025-Q4.
- Ran exploratory dropout-time analysis: median time-to-dropoff in the program is 47 days, with a sharp inflection at the 30-day mark (16% of all dropouts occur in days 28-32).
- Joined claim-level data for the cohort. Coverage holes for 6.4% of patients; flagged for follow-up with the claims team.

### Initial findings
- The strongest univariate signal we found is **telehealth no-show rate in weeks 1-3** — patients with ≥2 no-shows have a 3.2× higher dropout hazard.
- Medication-adherence scores show signal but are noisy below 60%.

### Blockers / risks
- Some demographics fields have non-trivial missingness (~14% on income bracket). We'll need imputation strategy or to exclude.

### Next week
- Move to multivariate Cox model. Begin fairness audit on the strongest signals.
`,
  },
  {
    id: "report_w2",
    projectId: "project_p2",
    teamId: "team_bioflux",
    submittedByUserId: "user_frank",
    weekOf: "2026-04-15",
    rawMarkdown: `## Week 2 (2026-04-15)

### Modeling progress
Built an initial multivariate Cox PH model. Top three coefficients (after standardization):
1. Telehealth no-show rate (HR 2.7, p<0.001)
2. Initial medication-adherence score (HR 0.74 per SD, p<0.01)
3. Number of comorbidity classes at enrollment (HR 1.18, p<0.05)

C-index on held-out patients: 0.71.

### Fairness audit
Slicing by income bracket: Cox model performance differs (C-index 0.74 for upper-income, 0.66 for lower-income). The gap is concerning. Investigating whether this is feature availability or genuine population shift.

### Blockers
The 0.71 C-index is below the 0.75 threshold MedScan flagged as a soft target. We may need to bring in claim-derived features.

### Next week
- Add claim-derived features (recent ER visits, fill gaps).
- Calibration plots.
`,
  },
  {
    id: "report_w3",
    projectId: "project_p2",
    teamId: "team_bioflux",
    submittedByUserId: "user_frank",
    weekOf: "2026-04-22",
    rawMarkdown: `## Week 3 (2026-04-22)

### Modeling progress
Added 7 claim-derived features. New C-index: **0.78** (up from 0.71). The biggest single addition: **recent ER visits in the prior 90 days** (HR 1.9, p<0.001).

### Fairness gap
The income-bracket gap narrowed substantially (0.79 vs 0.74). Improvement traces to ER-visit data being equally available across income groups.

### Intervention design draft
Based on the strongest predictors, we drafted three intervention rules for care managers:
- Trigger A: "≥2 telehealth no-shows in first 3 weeks" → call within 48h.
- Trigger B: "ER visit during week 2-4 of program" → in-person visit.
- Trigger C: "Adherence score drops by >20% week-over-week" → medication review.

### Blockers
- We can't yet validate the interventions causally — only the prediction is observational. Flagging this for MedScan: any A/B test of the rules would need IRB clearance.

### Next week
- Calibration + decision-curve analysis.
- Document model card for handoff.
`,
  },
] as const;
