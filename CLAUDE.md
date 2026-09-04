# Yellow AI - Claude Code Guidelines

**Project**: Educational AI platform for responsible student learning using socratic tutoring + parental supervision

**Mission**: Bridge education and technology by teaching students to use AI as a learning tool, not a shortcut

---

## 1. Architecture & Standards

### Core Principles
- **Pedagogy First**: All AI interactions must follow educational best practices (socratic method, spaced repetition)
- **Multi-Tenant, Multi-Role**: 4 distinct user interfaces (student, parent, teacher, director) with context-appropriate UX
- **Data Privacy**: Student/minor data protection is non-negotiable (LGPD/GDPR compliance)
- **Personalization**: Every interaction personalizes based on subject, grade level, learning history

### Tech Stack Decisions
- **Language**: [to be specified based on team expertise]
- **Frontend Framework**: [choose based on multi-profile UI complexity requirements]
- **Backend**: [choose based on real-time personalization + analytics requirements]
- **LLM Integration**: Use Claude API for socratic tutoring (RAG-based approach recommended)
- **Database**: Must support user profiles, academic history, performance metrics
- **Authentication**: Secure, with role-based access control (student/parent/teacher/director)

### Code Style & Conventions
- Clear separation between educational logic and infrastructure code
- Use feature flags for experimental pedagogical approaches
- Domain-driven design: keep "tutoring," "performance analytics," "gamification" as distinct domains
- Type safety wherever possible (prevents educational content mishaps)

---

## 2. Project Structure

```
yellow-ai-1/
├── src/
│   ├── features/
│   │   ├── tutoring/          # Socratic chatbot & RAG
│   │   ├── spaced-repetition/ # Flashcard system
│   │   ├── performance/       # Analytics for parents/teachers
│   │   ├── gamification/      # Coins, character customization
│   │   └── user-profiles/     # Student/parent/teacher/director roles
│   ├── core/
│   │   ├── ai-integration/    # LLM calls
│   │   ├── personalization/   # User history, preference tracking
│   │   └── auth/              # Role-based access control
│   ├── api/                   # Backend routes
│   ├── ui/                    # Frontend components
│   └── tests/
├── docs/
│   ├── ARCHITECTURE.md        # High-level system design
│   ├── PEDAGOGY.md            # Educational principles used
│   ├── API.md                 # API documentation (public routes only)
│   └── SETUP.md               # Developer onboarding
├── scripts/
│   ├── seed-content.ts        # Initialize curriculum data
│   └── validate-pedagogy.ts   # Verify socratic method implementation
└── .env.example               # Template (NO secrets in repo)
```

---

## 3. Development Workflow

### Before Starting Work
1. Read the relevant feature docs in `docs/`
2. Understand the user role(s) affected by your change
3. Consider data privacy implications (student records, academic history)

### During Development
- Write tests for educational logic (tutoring, performance calculations)
- Use `/diagnosing-bugs` skill for complex pedagogical issues
- Use `/codebase-design` for architecture questions
- Check personalization logic carefully—regressions hurt student experience

### Code Review Checklist
- [ ] No hardcoded student/academic data in code
- [ ] Socratic method preserved (questions guide, not answer)
- [ ] Personalization respects student learning pace
- [ ] Role-based access enforced (student can't see parent dashboard)
- [ ] No PII logged or exposed in errors
- [ ] Tests cover the feature's educational outcome

### Before Merging
- Run `/code-review ultra` for comprehensive analysis
- Verify no data leaks in console/logging
- Check that educational logic matches pedagogical intent

---

## 4. Key Domains & Responsibilities

### Tutoring Chatbot
- Implements socratic method (questions guide student to discovery)
- Personalizes based on: subject, grade level, student's learning history
- Uses RAG to ground responses in curriculum content
- **Constraint**: Never give direct answers; always guide

### Performance Analytics
- Tracks: accuracy, completion time, subject mastery, learning trends
- Shown to: parents (simplified), teachers (detailed), directors (aggregate)
- **Privacy**: Only show performance trends, never detailed wrong answers

### Spaced Repetition System
- Meta: 5-20 min daily (scales by grade: fundamental I=5, II=10, high school=20)
- Tracks which concepts student struggles with
- Feeds weak areas to tutoring chatbot

### Gamification
- Coins earned by: completing lessons, using spaced repetition, consistent progress
- Used for: character customization, visual motivation
- **Note**: Educational value, not addictive mechanics

### Multi-Profile UI
- **Student**: Friendly, game-like, encouraging (safe for children)
- **Parent**: Informative, data-driven, reassuring (shows child is learning well)
- **Teacher**: Practical, actionable (help individual students + generate tests)
- **Director**: Strategic, aggregate metrics (school performance, staff analytics)

---

## 5. Testing Strategy

### Unit Tests
- Educational logic: socratic questions, spaced repetition algorithms
- Personalization: correct content selection by grade/subject
- Role access: students can't access parent data

### Integration Tests
- User journey: student completes lesson → performance recorded → parent sees analytics
- RAG pipeline: question asked → relevant curriculum retrieved → socratic response generated

### Pedagogical Tests
- Verify socratic method preserved (no direct answers)
- Check personalization accuracy (right subject, right level)
- Validate spaced repetition timing (harder after success, easier after struggle)

---

## 6. Security & Privacy Priorities

**CRITICAL**: This platform handles data about minors

- No student data logged to external services
- Encrypt academic performance data at rest
- Use row-level security: students see only their data, parents see their child's data
- Audit logs for all data access (compliance requirement)
- No AI-generated content stored without review (safeguard against hallucinations)
- Session timeouts for student sessions (prevent unauthorized access)

---

## 7. Common Commands

```bash
# Development
npm run dev           # Start dev server with all profiles
npm run test          # Run all tests (unit + integration)
npm run test:pedagogy # Verify educational logic

# Deployment
npm run build         # Production build
npm run seed          # Initialize curriculum content
npm run validate      # Security & privacy validation

# Debugging
npm run debug:tutoring    # Debug socratic response generation
npm run debug:analytics   # Debug performance calculations
npm run debug:access      # Debug role-based access control
```

---

## 8. Decision Rules for This Startup

1. **Pedagogy > Features**: If a cool feature compromises the socratic method or learning outcomes, don't build it
2. **Privacy > Convenience**: When choosing between collecting more data vs. student privacy, choose privacy
3. **Multi-role First**: Every feature must work across all 4 user roles (or have clear reason not to)
4. **No Shortcuts for Kids**: Never let AI replace critical thinking development—always guide, never answer
5. **Fail Safe**: If uncertain about data privacy impact, don't ship it; ask for clarification

---

## 9. Communication with Claude Code

### When to Use `/code-review ultra`
- Before merging to main
- After implementing socratic tutoring logic
- Any changes to personalization algorithms
- New role/permission system changes

### When to Use `/plan`
- Designing new user-facing features
- Architecture decisions (which database? which LLM?)
- Complex pedagogical features

### When to Use `/diagnosing-bugs`
- Socratic method not working as expected
- Personalization giving wrong content
- Performance metrics misaligned

### When to Use Skills
- `/codebase-design` - "Should we split tutoring and analytics into microservices?"
- `/domain-modeling` - "Model the relationship between student concepts, performance, and spaced repetition"
- `/research` - Deep dives into pedagogical techniques or RAG implementations

---

## 10. What Matters Most Right Now

**Phase 1 Priority**: Get the core loop working
1. Basic student auth
2. Socratic tutoring chatbot (simple MVP)
3. Parent dashboard (view student performance)
4. Verify socratic method works (questions, not answers)

**Launch Gate**: No confidential data leaks, pedagogy sound, students can use safely

---

## References

- Project Brief: `Projeto de Startup.pdf` (in repo root)
- Educational Philosophy: Socratic method, spaced repetition research
- Privacy Compliance: LGPD (Brazil), GDPR (EU)
- Competitor Analysis: Plurall, Sokrates AI
