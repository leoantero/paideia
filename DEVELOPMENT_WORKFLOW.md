# Claude Code as Your Senior Engineer

This document explains how to use Claude Code effectively as the senior engineer for Yellow AI.

## Philosophy

Claude Code is your **architectural advisor**, **code reviewer**, and **pedagogical consultant**. You're the decision maker; Claude is the expert who helps you make better decisions faster.

## Setup Complete ✓

Your Claude Code environment is configured with:
- ✓ Project principles in `CLAUDE.md`
- ✓ Architecture guidelines in `docs/ARCHITECTURE.md`
- ✓ Pedagogical rules in `docs/PEDAGOGY.md`
- ✓ Git safety settings in `.claude/settings.json`
- ✓ Context saved in project memory

**Claude now understands your startup and can make informed decisions.**

---

## Daily Workflow

### Morning: Architecture Review

When starting a new feature or sprint:

```bash
# In Claude Code chat:
/plan

I'm building [feature name]. Here's what I want to accomplish: [description]
What's the right architecture? Any risks I should know about?
```

**Claude will**:
- Suggest architecture based on CLAUDE.md principles
- Identify privacy/security risks early
- Flag potential pedagogical issues
- Recommend which other features this impacts

### Development: Write Code With Guidance

```bash
# In Claude Code:
Here's my approach for the tutoring chatbot...

[Your code/pseudocode]

Is this preserving the socratic method?
Any edge cases I'm missing?
```

**Claude will**:
- Spot socratic method violations immediately
- Catch common bugs before testing
- Suggest optimizations
- Question assumptions

### Quality Gate: Code Review Before Merge

```bash
# When your feature is complete:
/code-review ultra

Review this implementation for:
1. Pedagogical soundness (socratic method preserved?)
2. Privacy compliance (no PII leaks?)
3. Role access (can't cross-role boundaries?)
4. Edge cases (handles all student grade levels?)
```

**Claude will**:
- Deep analysis of your changes
- Verified findings (not just suggestions)
- Clear explanations of issues
- Recommendations for fixes

### Blocking Issues: Systematic Debugging

```bash
# When something isn't working as expected:
/diagnosing-bugs

The tutoring chatbot is responding with direct answers.
I expect it to always ask guiding questions.
What's the root cause?
```

**Claude will**:
- Walk through the system systematically
- Identify the actual problem (not just symptoms)
- Suggest solutions
- Help you prevent similar issues

---

## When to Use Each Claude Tool

### `/plan` - Feature Design
**Use when**: Starting a new feature, uncertain about architecture, need stakeholder alignment

**Example**:
```
/plan

I need to build the parent dashboard.
Should this be a separate UI or part of the main app?
What performance constraints do we have with analytics calculations?
```

### `/code-review ultra` - Pre-Merge Review
**Use when**: Feature implementation complete, ready to merge to main

**Example**:
```
/code-review ultra

Reviewing spaced repetition algorithm before shipping.
```

### `/codebase-design` - Architecture Decisions
**Use when**: Evaluating major architectural choices, refactoring decisions

**Example**:
```
/codebase-design

We're growing fast. Should we split tutoring and analytics services?
What are the data privacy implications?
```

### `/diagnosing-bugs` - Complex Problems
**Use when**: Stuck on a complex issue, need systematic troubleshooting

**Example**:
```
/diagnosing-bugs

Personalization isn't working correctly for 4th graders.
Math problems are too easy, Portuguese problems too hard.
```

### `/design` - UI/UX Mocks
**Use when**: Need to design student/parent/teacher/director interfaces

**Example**:
```
/design

Design the student dashboard. Should be game-like and encouraging.
Show tutoring chat, spaced repetition cards, coins/character.
```

---

## Decision Framework

Claude makes recommendations. **You make final decisions.** Here's how to handle disagreement:

### When Claude Suggests Something You Disagree With

**Do this**:
```
I hear you, but here's why I'm choosing differently:
[Your reasoning]

Can you help me mitigate the risks of this approach?
```

**Claude will**:
- Adjust recommendations based on your constraints
- Help you minimize downsides of your chosen approach
- Respect your authority while providing expert input

### When Claude Flags Something Important

**Do this**:
```
I understand the privacy risk. Here's how I'm planning to handle it:
[Your mitigation strategy]

Does this address your concern?
```

**Claude will**:
- Verify your approach is sufficient
- Suggest improvements if needed
- Confirm it's safe to proceed

---

## Monthly Practices

### Weekly: Architecture Review
```
/codebase-design

Let's review what we've built so far.
Are there architectural debt we should address?
Is anything violating PEDAGOGY.md principles?
```

### Monthly: Pedagogical Audit
```
/code-review ultra

Full review of tutoring chatbot implementation.
Is the socratic method preserved?
Are personalization levels correct for each grade?
```

### Quarterly: Security & Privacy Audit
Ask Claude to:
- Review data handling for LGPD/GDPR compliance
- Check for unintended data leaks
- Audit role-based access control
- Verify student data isn't exposed in logs

---

## Critical Workflows

### Adding New Role Type
If you need to add a new user role (e.g., "tutors"):

```
/plan

I'm adding a new "tutor" role to the system.
Should this be a new UI or subset of teacher UI?
What permissions should they have?
What data should they see?
```

Then `/code-review ultra` after implementation to verify:
- ✓ Can't accidentally see student data inappropriately
- ✓ Can't modify other roles' data
- ✓ UI reflects their specific needs

### Integrating New LLM Features
Before adding new AI capabilities:

```
/plan

I want to add [feature] using Claude API.
Will this preserve the socratic method?
What are the token/cost implications?
Any privacy concerns with the prompt?
```

### Handling a Production Bug
When something breaks:

```
/diagnosing-bugs

[Describe the issue]
[Describe what you expected]
[Show any error logs]

What went wrong and how do I prevent it?
```

---

## Using Claude Code Across Your Team

### For Team Leads
- Use `/plan` to design features before assigning to engineers
- Use `/code-review ultra` before approving merges
- Use `/codebase-design` to evaluate architectural proposals

### For Senior Engineers
- Use `/diagnosing-bugs` to troubleshoot complex issues
- Use `/codebase-design` to evaluate design decisions
- Help junior engineers understand Claude's feedback

### For Junior Engineers
- Use `/plan` to understand feature architecture before coding
- Use `/diagnosing-bugs` when stuck
- Learn from `/code-review ultra` feedback

---

## Memory & Context

Claude has memorized:
- ✓ Your project's mission and features
- ✓ Pedagogical principles (socratic method, spaced repetition)
- ✓ Privacy requirements (student data protection)
- ✓ All 4 user roles and their needs
- ✓ Decision rules in CLAUDE.md

**You don't need to repeat context.** Just ask:
```
I need help with the tutoring chatbot. [Your specific question]
```

Claude already knows it's for kids, needs socratic method, requires personalization, etc.

---

## Example Day in Development

### 9:00 AM - Planning
```
/plan

I want to build the test question generator for teachers.
Should this use the same curriculum RAG as tutoring?
How do I ensure questions are age-appropriate?
```
→ Claude designs the feature, identifies risks

### 10:00 AM - Implementation
```
Here's my implementation of the test generator...
[code]

Does this preserve curriculum context?
```
→ Claude provides guidance on code quality

### 2:00 PM - Review
```
/code-review ultra

Ready to merge test generator to main.
```
→ Claude provides comprehensive review

### 4:00 PM - Bug Fix
```
/diagnosing-bugs

Questions generated are too hard for 4th graders.
Same question generator for all grades.
```
→ Claude identifies the root cause (missing grade-level filtering)

---

## Success Metrics

You'll know Claude Code is working well when:

- ✓ Features get reviewed faster (before bugs reach production)
- ✓ Pedagogical issues caught in design, not after launch
- ✓ Privacy/security issues identified early
- ✓ Team doesn't repeat mistakes (Claude remembers patterns)
- ✓ Decisions are better reasoned (multiple angles considered)
- ✓ Onboarding new team members is faster (they can ask Claude)

---

## Next Steps

1. ✓ Read all docs (`CLAUDE.md`, `ARCHITECTURE.md`, `PEDAGOGY.md`)
2. ✓ Understand project structure
3. Start your first feature with `/plan`
4. Merge with `/code-review ultra`
5. Build something amazing 🚀

---

**You now have a senior engineer at your side, ready to help.**

The rest is up to you and your team. Build wisely. 🎓
