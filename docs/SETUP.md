# Paideia - Developer Setup Guide

## Welcome to Paideia

This guide will help you get up to speed on the project and set up your development environment.

## Quick Start (30 min)

### 1. Understand the Project

- Read `CLAUDE.md` (project overview + decision rules)
- Read `ARCHITECTURE.md` (system design)
- Read `PEDAGOGY.md` (how we teach with AI)

### 2. Understand Your Role

- **Frontend Developer**: Focus on `src/ui/` and multi-role interface design
- **Backend Developer**: Focus on `src/features/` and `src/core/`
- **AI/ML Developer**: Focus on `src/features/tutoring/` and RAG implementation
- **DevOps/Infra**: Focus on deployment, monitoring, data privacy

### 3. Set Up Local Environment

```bash
# Clone and install
git clone <repo>
cd yellow-ai-1
npm install

# Verify setup
npm run test
npm run build
```

## Project Structure

```
src/
├── features/
│   ├── tutoring/          # Socratic chatbot (CRITICAL: preserve socratic method)
│   │   ├── socratic-response-generator.ts
│   │   ├── curriculum-rag.ts
│   │   ├── personalization-engine.ts
│   │   └── tests/
│   ├── spaced-repetition/ # Flashcard system
│   │   ├── scheduling.ts
│   │   ├── difficulty-algorithm.ts
│   │   └── tests/
│   ├── performance/       # Analytics for all roles
│   │   ├── metrics-calculator.ts
│   │   └── tests/
│   ├── gamification/      # Coins + character customization
│   │   └── reward-engine.ts
│   └── user-profiles/     # 4 role types
│       ├── student-profile.ts
│       ├── parent-profile.ts
│       ├── teacher-profile.ts
│       └── director-profile.ts
├── core/
│   ├── ai-integration/    # Claude API calls (NO secrets in code!)
│   ├── personalization/   # User preference tracking
│   └── auth/              # Role-based access control
├── api/                   # Backend routes (careful with data exposure)
├── ui/                    # Frontend components
│   ├── student-interface/ # Friendly, game-like
│   ├── parent-interface/  # Informative, data-focused
│   ├── teacher-interface/ # Practical, actionable
│   └── director-interface/# Strategic, aggregate metrics
└── tests/                 # Integration + pedagogical tests
```

## Common Development Tasks

### Adding a New Feature

1. **Plan**: Use `/plan` to design the feature across all roles
2. **Architecture**: Read ARCHITECTURE.md and update if needed
3. **Implement**: Follow the CLAUDE.md decision rules
4. **Test**: Write tests for educational logic
5. **Review**: Use `/code-review ultra` before merging

### Working on the Tutoring Engine

```typescript
// REMEMBER: Socratic method = questions, not answers
// ❌ BAD:
function tutorResponse(question: string): string {
  return "The answer is 42 because..."; // Breaks learning!
}

// ✓ GOOD:
function tutorResponse(question: string, studentGrade: Grade): string {
  return "Great question! Let me ask you: What do you already know about this topic?";
}
```

### Working on Analytics

```typescript
// REMEMBER: Privacy first, show trends not details
// ❌ BAD:
function parentDashboard(studentId: string) {
  return {
    wrong_answers: [...], // Shows individual mistakes
    exact_scores: {...}   // Too detailed
  };
}

// ✓ GOOD:
function parentDashboard(studentId: string) {
  return {
    subject_strengths: ["Math", "English"],
    areas_needing_help: ["History"],
    learning_trend: "improving"
  };
}
```

### Working on Multi-Role UI

Each role sees different data:

```typescript
interface StudentUI {
  tutoring_chat: ChatInterface;
  flashcards: SpacedRepetitionInterface;
  character: GameCharacter;
  daily_goal: ProgressBar;
}

interface ParentUI {
  performance_summary: SubjectPerformance[];
  weak_areas: Recommendation[];
  learning_trend: Chart;
}

interface TeacherUI {
  student_insights: StudentInsight[];
  class_performance: AggregatedMetrics;
  test_question_generator: ToolInterface;
}

interface DirectorUI {
  school_performance: AggregatedMetrics;
  staff_performance: EmployeeMetrics[];
}
```

## Key Principles to Remember

### 1. Pedagogy First

Before implementing any feature, ask: "Does this help students learn?"

### 2. Privacy by Default

Student data is sensitive. Think before logging, storing, or sending data.

### 3. No Shortcuts

The whole point is to teach students not to use AI as a shortcut. Don't build features that encourage shortcuts.

### 4. Personalization Matters

Same content won't work for 4th graders and high schoolers. Always consider grade level.

### 5. Test Your Assumptions

Write tests for educational logic, not just code logic.

## Testing

### Unit Tests

```bash
npm run test
```

Focus on:

- Socratic method preservation
- Personalization correctness
- Permission/access control

### Pedagogical Tests

```bash
npm run test:pedagogy
```

Verify:

- Tutoring responses follow socratic method
- Spaced repetition timing is correct
- Performance metrics accurately reflect learning

### Integration Tests

```bash
npm run test:integration
```

Test full user journeys:

- Student → tutoring chat → performance recorded → parent sees update

## Using Claude Code Effectively

### For Design Decisions

```
/plan

I need to design the spaced repetition algorithm.
Should we use the Leitner system or SM-2?
What are the tradeoffs?
```

### For Code Review

```
/code-review ultra

Review this tutoring chatbot implementation.
Does it preserve the socratic method?
Any privacy concerns?
```

### For Architecture Questions

```
/codebase-design

Should we split tutoring and analytics into microservices?
What's the impact on data privacy?
```

### For Debugging Educational Logic

```
/diagnosing-bugs

The tutoring chatbot is giving direct answers instead of guiding.
How can I verify the socratic method is being applied?
```

## Deployment Checklist

Before pushing to production:

- [ ] No API keys or secrets in code
- [ ] No student data logged to external services
- [ ] All educational logic tested (pedagogical tests pass)
- [ ] Role-based access control verified (student can't see parent data)
- [ ] Privacy audit passed (no PII exposure)
- [ ] Socratic method preserved in tutoring responses
- [ ] Performance metrics accurately reflect learning
- [ ] Code review ultra passed

## Getting Help

1. **Architecture Questions**: Read ARCHITECTURE.md first
2. **Pedagogical Questions**: Read PEDAGOGY.md + CLAUDE.md
3. **Complex Problems**: Use `/diagnosing-bugs` or `/codebase-design`
4. **Code Review**: Always use `/code-review ultra` before merging
5. **Stuck**: Ask in your team channel with context

## Next Steps

1. Complete this setup guide
2. Read PEDAGOGY.md (understand what we're building)
3. Read ARCHITECTURE.md (understand how it fits together)
4. Set up your dev environment (`npm install`)
5. Check out Phase 1 tasks (in GitHub issues or Linear)
6. Pick a feature and start building!

---

**Welcome aboard!** 🚀 We're building the future of responsible AI in education.
