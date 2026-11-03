# Paideia

Educational AI platform that teaches students to use AI as a learning tool, not a shortcut — Socratic tutoring, spaced repetition, and a longitudinal learning graph, with parent, teacher, and director views.

## Why it's different

Most AI tutoring products are a thin chat wrapper around a frontier model — a commodity that gets rebuilt by the next model release. The defensible part of Paideia is the **learning graph**: an append-only, per-student, per-concept history of every tutoring interaction, from which mastery is 100% recomputable. See `docs/LEARNING_GRAPH.md`.

## Product

- **Student**: Socratic tutoring chatbot (guides with questions, never gives direct answers), spaced-repetition flashcards, gamification (coins, character customization)
- **Parent**: Simplified performance dashboard — trends, not detailed wrong answers
- **Teacher**: Detailed student insights, test generation from curriculum
- **Director**: Aggregate school/staff performance metrics

## Stack

- **Framework**: Next.js 16 (App Router) + React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Backend/DB**: Supabase (Postgres, RLS, service-role writes for the learning graph)
- **LLM**: Claude API (Anthropic) for Socratic tutoring and question tagging
- **Testing**: Vitest

## Getting started

```bash
npm install
npm run dev            # start dev server
npm run test           # unit + integration tests
npm run test:pedagogy  # verify Socratic method / tutoring logic
npm run audit:security # row-level security isolation checks
```

Copy `.env.example` to `.env.local` and fill in your own Supabase/Anthropic credentials — never commit secrets.

## Project structure

```
src/
├── features/
│   ├── tutoring/          # Socratic chatbot & RAG
│   ├── learning-graph/    # Append-only evidence recorder (server-only writes)
│   ├── spaced-repetition/ # Flashcard system
│   ├── performance/       # Analytics for parents/teachers/directors
│   ├── gamification/      # Coins, character customization
│   └── user-profiles/     # Student/parent/teacher/director roles
├── core/
│   ├── ai-integration/    # LLM calls
│   ├── personalization/   # User history, preference tracking
│   └── auth/              # Role-based access control
├── api/                   # Backend routes
└── ui/                    # Frontend components (design system: kit.tsx)
docs/
├── ARCHITECTURE.md
├── LEARNING_GRAPH.md
├── PEDAGOGY.md
└── SECURITY_REVIEW.md
supabase/
└── migrations/            # Schema, RLS policies
```

## Core principles

- **Pedagogy over features** — if it compromises the Socratic method, it doesn't ship
- **Privacy by default** — minors' data; row-level security, encrypted at rest, audited access
- **No shortcuts for kids** — AI guides, never answers
- **Learning events are append-only** — no update, no delete; mastery is derived, never authored directly

See `CLAUDE.md` for the full set of engineering and product decision rules.
