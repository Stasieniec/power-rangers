import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

const ts = () =>
  integer("created_at")
    .notNull()
    .default(sql`(unixepoch() * 1000)`);
const updatedTs = () =>
  integer("updated_at")
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    clerkId: text("clerk_id").notNull(),
    email: text("email").notNull(),
    role: text("role", { enum: ["company", "researcher"] }).notNull(),
    displayName: text("display_name").notNull(),
    createdAt: ts(),
    updatedAt: updatedTs(),
  },
  (t) => [uniqueIndex("users_clerk_id_idx").on(t.clerkId), index("users_email_idx").on(t.email)]
);

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  website: text("website"),
  logoUrl: text("logo_url"),
  createdAt: ts(),
});

export const researchers = sqliteTable("researchers", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  openalexId: text("openalex_id"),
  orcid: text("orcid"),
  affiliation: text("affiliation"),
  headline: text("headline"),
  aiSummary: text("ai_summary"),
  createdAt: ts(),
});

export const publications = sqliteTable(
  "publications",
  {
    id: text("id").primaryKey(),
    researcherId: text("researcher_id")
      .notNull()
      .references(() => researchers.id),
    openalexWorkId: text("openalex_work_id"),
    title: text("title").notNull(),
    year: integer("year"),
    venue: text("venue"),
    abstract: text("abstract"),
    citationCount: integer("citation_count").notNull().default(0),
    doi: text("doi"),
    createdAt: ts(),
  },
  (t) => [index("publications_researcher_idx").on(t.researcherId)]
);

export const researcherConcepts = sqliteTable(
  "researcher_concepts",
  {
    id: text("id").primaryKey(),
    researcherId: text("researcher_id")
      .notNull()
      .references(() => researchers.id),
    concept: text("concept").notNull(),
    score: real("score").notNull(),
    createdAt: ts(),
  },
  (t) => [index("rc_researcher_idx").on(t.researcherId)]
);

export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => users.id),
  createdAt: ts(),
});

export const teamMembers = sqliteTable(
  "team_members",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role", { enum: ["lead", "member"] }).notNull(),
    joinedAt: integer("joined_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    uniqueIndex("team_members_uniq").on(t.teamId, t.userId),
    index("tm_team_idx").on(t.teamId),
    index("tm_user_idx").on(t.userId),
  ]
);

export const teamInvites = sqliteTable(
  "team_invites",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    code: text("code").notNull(),
    invitedEmail: text("invited_email"),
    expiresAt: integer("expires_at").notNull(),
    usedByUserId: text("used_by_user_id").references(() => users.id),
    createdAt: ts(),
  },
  (t) => [uniqueIndex("team_invites_code_idx").on(t.code)]
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    title: text("title").notNull(),
    businessPlan: text("business_plan").notNull(),
    endGoal: text("end_goal").notNull(),
    status: text("status", { enum: ["draft", "open", "in_progress", "completed"] })
      .notNull()
      .default("draft"),
    acceptedTeamId: text("accepted_team_id").references(() => teams.id),
    createdAt: ts(),
    updatedAt: updatedTs(),
  },
  (t) => [index("projects_company_idx").on(t.companyId), index("projects_status_idx").on(t.status)]
);

export const researchQuestions = sqliteTable(
  "research_questions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    question: text("question").notNull(),
    rationale: text("rationale").notNull(),
    orderIndex: integer("order_index").notNull(),
    aiGenerated: integer("ai_generated", { mode: "boolean" }).notNull().default(true),
    concepts: text("concepts").notNull().default("[]"), // JSON: [{label, weight}]
    createdAt: ts(),
  },
  (t) => [index("rq_project_idx").on(t.projectId)]
);

export const applications = sqliteTable(
  "applications",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    status: text("status", { enum: ["pending", "accepted", "rejected"] })
      .notNull()
      .default("pending"),
    matchScore: integer("match_score").notNull(),
    matchRationale: text("match_rationale").notNull(),
    perQuestionAlignment: text("per_question_alignment").notNull().default("[]"),
    pitch: text("pitch").notNull(),
    createdAt: ts(),
  },
  (t) => [
    uniqueIndex("apps_project_team_uniq").on(t.projectId, t.teamId),
    index("apps_project_idx").on(t.projectId),
  ]
);

export const reports = sqliteTable(
  "reports",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    weekOf: text("week_of").notNull(), // ISO date YYYY-MM-DD
    rawMarkdown: text("raw_markdown").notNull(),
    submittedByUserId: text("submitted_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: ts(),
  },
  (t) => [index("reports_project_idx").on(t.projectId)]
);

export const reportFindings = sqliteTable(
  "report_findings",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id")
      .notNull()
      .references(() => reports.id),
    researchQuestionId: text("research_question_id")
      .notNull()
      .references(() => researchQuestions.id),
    finding: text("finding").notNull(),
    businessTranslation: text("business_translation").notNull(),
    impactNote: text("impact_note").notNull(),
    createdAt: ts(),
  },
  (t) => [index("rf_report_idx").on(t.reportId)]
);

export const reportFiles = sqliteTable("report_files", {
  id: text("id").primaryKey(),
  reportId: text("report_id")
    .notNull()
    .references(() => reports.id),
  r2Key: text("r2_key").notNull(),
  filename: text("filename").notNull(),
  size: integer("size").notNull(),
  createdAt: ts(),
});
