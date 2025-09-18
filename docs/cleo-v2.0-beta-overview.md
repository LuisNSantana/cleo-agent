# Cleo 2.0 Beta — Launch Guide & Feature Highlights

Welcome to Cleo 2.0 Beta: a calmer, faster, and more capable workspace where your projects, documents, and agents feel truly connected — and beautifully so.

This guide explains what’s new, why it matters, and how to get value in minutes. Less jargon, more outcomes.

- Audience: teams and creators who want a premium AI workspace that stays organized and feels effortless.
- Promise: clarity, trust, and speed — with a look and feel that matches.

---

## Table of Contents

1. What’s New in v2.0 Beta
2. Why Projects Matter
3. Data Model and Access Controls (High‑Level)
4. ProjectId Propagation End‑to‑End
5. RAG: Retrieval Scoped by Project
6. Agents: Creation and the Execution Circuit
7. UI/UX Principles and Key Affordances
8. Typical Workflows
9. API & Data Contracts (Illustrative)
10. Reliability, Testing, and Quality Gates
11. Deployment & Configuration Notes
12. Glossary
13. Changelog (v2.0 Beta Highlights)
14. Quick Start (Operators)

---

## 1) What’s New — At a Glance

### Experience that feels premium

- A truly premium dark mode (neutral black) that lets content shine — no more blue tint.
- A warm, gentle light mode that reduces eye fatigue and keeps focus on your work.
- A calmer interface: single scroll, fewer redundant controls, and more space to think.
- Small but meaningful touches: a tasteful BETA chip and a subtle Huminary Labs signature.

### Organization that scales

- Projects keep everything in one place — chats, documents, and agents — so context never bleeds.
- Strong privacy by design: your data stays within your projects and with your team.
- Faster answers: retrieval only looks where it should, so results are more relevant and quick.

### Reliability, everywhere

- Clearer layouts and controls that show up exactly once.
- Better spacing on mobile so nothing gets hidden behind headers.
- Consistent previews and document surfaces — reading and sharing feel polished.

---

## 2) Projects — your organized, private workspace

Projects are where everything lives: chats, files, and the agents that help you. They’re the secret to staying organized and safe.

What you get:

- Clean separation between clients, teams, and topics — no accidental mixups.
- Faster, more relevant answers because retrieval searches within the project, not your entire account.
- Peace of mind: access is scoped; people only see what they should.

---

## 3) What powers the experience (in simple terms)

- Smart scoping: every action knows which project you’re in, so answers stay relevant and private.
- Trust built‑in: access control follows you everywhere — API, UI, and retrieval.
- Speed where it counts: focused search + good indexing = faster results and smoother chats.

---

## 4) Outcomes you’ll feel

- Answers that stay on topic (no cross‑project contamination).
- Less time hunting for files — Cleo already knows which ones belong to this project.
- A UI that helps you focus, not fight with it.

---

## 5) Documents that actually work for you

Upload once, use everywhere — inside that project.

What happens behind the scenes (the short version):

1. You upload a file → Cleo processes it for searchability.
2. When you ask something, Cleo looks inside the project’s documents for the right passages.
3. You get an answer grounded in your files, with citations when useful.

It’s fast, targeted, and private by default.

---

## 6) Agents — your team in a box

Agents combine a role (e.g., Researcher, Designer, Coder) with the tools they need.

In practice:

1. Pick or create an agent with the right attitude and skills.
2. Assign it to your project so it automatically knows which documents to use.
3. Let it plan, call tools, and synthesize results — or even delegate to other agents.

Tip: Start simple. A focused agent with the right documents beats a complex setup with too many knobs.

---

## 7) Design choices that help you think

We tuned the interface to get out of your way:

- A single scroll container — no more nested scrolling.
- Predictable placements for key actions: upload, edit, model.
- Polished look in both dark and light themes.
- The BETA chip invites feedback; the Huminary Labs signature keeps it personal.

---

## 8) Quick wins — do this first

1. Create a new project for a focused task (e.g., "Brand Launch Q4").
2. Upload 2–3 key documents you want Cleo to use.
3. Start a chat in that project and ask a question referencing those docs.
4. (Optional) Create a simple agent (e.g., Researcher) and assign it to the project.
5. Iterate — Cleo’s suggestions get better with good documents and clear prompts.

---

## 9) Under the hood — in one minute

We keep the technical bits simple and invisible:

- Your project context travels with you from UI to API to database.
- Access control and retrieval only look inside the current project.
- Indexes help keep things quick even as your workspace grows.

---

## 10) Reliability you can feel

- Clear ownership and access: projects define who sees what.
- Answers you can trust: grounded in your documents when needed.
- Smooth on mobile and desktop: consistent, predictable behavior.

---

## 11) Availability

Cleo 2.0 Beta is rolling out progressively. If you’re in, you’ll see the BETA chip in the header.
Have feedback? We want it — that’s how we finish strong.

---

## 12) Glossary (fast)

- Project: your organized workspace boundary.
- RAG: answers grounded in your documents.
- Agent: a role with tools (e.g., Researcher, Designer, Coder).
- Tool: a safe capability an agent can run.

---

## 13) Highlights recap

- Unify dark theme background to neutral black across desktop/mobile; remove blue tint.
- Introduce warm pastel light theme with subtle borders and gentle sidebar surface.
- Align system chrome (viewport & manifest) with themes.
- Add BETA chip next to Cleo wordmark; add Huminary Labs avatar logo in sidebar footer.
- Deduplicate model selector in project contexts; reduce visual clutter.
- Fix spacing and scroll issues; single scroll container across key views.
- Strengthen `projectId` propagation across API and pipeline; reinforce RLS end‑to‑end.
- Align OpenGraph and code block surfaces with neutral/dark theme.
- Multiple micro‑UX and accessibility improvements.

---

## 14) Get started in 60 seconds

1. Create a project and upload at least one document.
2. Start a chat inside that project; ask a question referencing the document.
3. (Optional) Create a simple agent (e.g., Researcher) bound to the same project.
4. Validate that answers stay focused on this project’s content.
5. Share with a teammate and iterate.

---

> For questions or feedback on the Beta, use the BETA indicator in the header as a reminder to send feedback early and often.
