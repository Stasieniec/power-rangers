# Polymath — On-stage demo script (3:30)

Two browser windows side by side: **Alice (researcher)** on the left, **MedScan (company)** on the right.

## Open (0:00 – 0:10)

**Alice window: `/`**

> "Polymath is research, posed as a competition. Companies post end-goals; we translate them to research questions; teams compete with real publication data. Three pillars, all visible today."

Click "Get started → researcher".

## Pillar 2: Researcher onboarding (0:10 – 0:50) — Hero B

**Alice window: `/onboard`**

> "Alice just signed up. Polymath asks for her ORCID."

Paste Alice's ORCID (or click a demo researcher).

> "We hit OpenAlex live, fetch her publication history, and Gemini synthesizes an expertise profile."

Watch skeleton phases ("Fetching…" → "Analyzing…").

> "Real publications. Real concepts. Same vocabulary the matching engine will use."

## Team formation (0:50 – 1:00)

**Alice window: `/teams/convex-lab`**

> "Alice is on Convex Lab with Bob — already onboarded with his own publications. Aggregate expertise computed across both."

## Project browse + apply (1:00 – 1:55) — Hero D

**Alice window: `/projects` → click MedScan's open project**

> "Here's MedScan's project: late-stage clinical trial dropout prediction. Polymath generated five research questions from MedScan's brief — we'll show that engine in a minute."

Click "Apply with my team."

Type 2-sentence pitch.

> "When Alice's team applies, we compute a real concept-overlap score between her team's expertise and the project questions — cosine similarity over OpenAlex concepts. Then Gemini writes a rationale and adjusts the score. The number isn't a vibe; it has math under it."

Submit. Watch skeleton: "Computing concept overlap…" → "Asking Gemini…".

> "84/100 with a rationale citing specific publications."

## Switch to MedScan (1:55 – 2:00)

> "Now MedScan's side."

## Pillar 1: Project posting (2:00 – 2:30) — Hero A

**MedScan window: `/projects/new`**

> "MedScan's other project starts as a paragraph of business plan. Watch."

Paste a different business plan + end-goal. Submit.

> "Gemini transforms it into 5 research questions, each tagged with concepts. MedScan can edit any of them, regenerate, or publish as-is."

## Application review (2:30 – 2:50)

**MedScan window: `/projects/p1/manage`**

> "Three teams applied. Convex Lab on top with 84. Two competitors at 71 and 65. Each comes with rationale and per-question alignment."

Expand Convex Lab's per-question alignment.

> "Per question, you see why this team fits. Click accept."

Click Accept on Convex Lab.

## Pillar 3: Alignment dashboard (3:00 – 3:30)

**MedScan window: `/projects/p2/dashboard`**

> "And here's what alignment looks like once research is underway. MedScan's other project, three weeks in. Each weekly report is translated into per-question business-language cards: technical finding on the left, business translation on the right, impact in gold. The translation is the comms layer."

Scroll through the cards.

(Optional, if time): switch to a researcher account on BioFlux Lab, submit a 4th report, watch cards animate in.

## Wrap (3:30)

> "Three pillars. Four AI moments. Real publication data. That's Polymath."
