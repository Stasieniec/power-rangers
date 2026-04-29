export const PROJECTS = [
  {
    id: "project_p1",
    title: "Late-stage clinical trial outcome prediction",
    businessPlan: `MedScan Diagnostics partners with mid-size hospital networks running phase III oncology trials. Trial dropouts cost roughly $15K per patient enrolled and inflate timelines by 4-7 months on average. We have anonymized EHR data, lab panels, and patient-reported outcomes from 12 historical trials.

Our hypothesis: a substantial fraction of dropouts are predictable from week 4 baseline data combined with longitudinal vitals signals through week 12. Predicting them early would let trial coordinators intervene with retention services.`,
    endGoal:
      "A risk score per enrolled trial participant, computed at week 4 and updated monthly, that flags patients with >60% probability of dropout in the next 8 weeks. The score must be auditable and ship with feature attribution suitable for IRB review.",
    status: "open",
  },
  {
    id: "project_p2",
    title: "Patient drop-off risk modeling for chronic care programs",
    businessPlan: `MedScan operates a chronic-care-management partnership with three hospital systems. Patients enrolled in care plans see meaningful improvements in readmission rates, but ~28% drop off the program in the first 90 days, eliminating most of the per-patient ROI.

We have 18 months of program data: enrollment events, telehealth attendance, medication-adherence scores, claim adjudications, and demographics.`,
    endGoal:
      "Identify the top three behavioral predictors of 90-day drop-off, build a risk model that ranks patients at enrollment, and design intervention guidelines for care managers based on the strongest predictors.",
    status: "in_progress",
    acceptedTeamId: "team_bioflux",
  },
] as const;
