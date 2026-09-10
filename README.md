# Paideia - Educational AI Platform

Building the future of responsible AI in education through Socratic tutoring and parental supervision.

## 🎯 Mission

Teach students to use AI as a **learning tool**, not a shortcut, while giving parents and teachers visibility into learning outcomes.

## 🚀 Quick Start

### For New Team Members
1. Read `docs/SETUP.md` (developer onboarding)
2. Read `CLAUDE.md` (project principles & decisions)
3. Read `docs/ARCHITECTURE.md` (system design)
4. Read `docs/PEDAGOGY.md` (how we teach)

### To Start Development
```bash
npm install
npm run dev           # Start dev server
npm run test          # Run all tests
npm run test:pedagogy # Verify educational logic
npm run code-review ultra  # Before merging
```

## 📋 Project Structure

```
yellow-ai-1/
├── CLAUDE.md              # Project guidelines (REQUIRED READING)
├── Projeto de Startup.pdf # Original product brief
├── src/                   # Source code
├── docs/
│   ├── SETUP.md          # Developer setup guide
│   ├── ARCHITECTURE.md    # System design
│   ├── PEDAGOGY.md        # Educational principles
│   └── API.md            # API documentation
├── .claude/
│   └── settings.json     # Claude Code configuration
└── README.md             # This file
```

## 🎓 Product Features

### For Students
- **Socratic Tutoring Chatbot**: AI asks questions to guide learning, never gives answers
- **Spaced Repetition**: Smart flashcard system (5-20 min daily)
- **Gamification**: Earn coins, customize character

### For Parents
- **Performance Dashboard**: Subject-level insights + weak area recommendations
- **Learning Analytics**: Track progress over time
- **Tutoring Recommendations**: Get alerts if child needs support

### For Teachers
- **Student Insights**: Common misconceptions + performance trends
- **Test Generation**: Auto-generate questions from curriculum
- **Class Analytics**: Monitor class performance at a glance

### For School Directors
- **School Analytics**: Aggregate student performance metrics
- **Staff Performance**: Monitor teacher effectiveness
- **System Health**: Overall platform usage and engagement

## 🛡️ Core Principles

✓ **Pedagogy First**: Educational value > features  
✓ **Privacy by Default**: Student data protection is non-negotiable  
✓ **No Shortcuts**: Preserve critical thinking through socratic method  
✓ **Personalization**: Adapt to each student's grade level and learning pace  
✓ **Multi-Role Design**: Each stakeholder sees exactly what they need  

## 🔄 Development Workflow

### Before Coding
- Use `/plan` for complex features
- Use `/codebase-design` for architecture questions
- Read relevant docs in `docs/`

### During Coding
- Follow decision rules in `CLAUDE.md`
- Preserve socratic method in tutoring logic
- Write tests for educational outcomes
- Use `/diagnosing-bugs` for complex issues

### Before Merging
- Run `/code-review ultra` for comprehensive analysis
- Verify no PII leaks
- Confirm pedagogical logic is sound
- Check all roles work correctly

## 🗂️ Tech Stack (To Be Decided)

- **Language**: [Core team to decide]
- **Frontend**: [Multi-role UI framework TBD]
- **Backend**: [Node/Python/Java TBD]
- **Database**: [SQL/NoSQL based on needs]
- **LLM**: Claude API (via Anthropic)
- **Auth**: Role-based access control

## 📚 Key References

- **Project Brief**: `Projeto de Startup.pdf` (what we're building)
- **Architecture**: `docs/ARCHITECTURE.md` (how it works)
- **Pedagogy**: `docs/PEDAGOGY.md` (why we teach this way)
- **Decisions**: `CLAUDE.md` (decision rules for this startup)
- **Setup**: `docs/SETUP.md` (get started developing)

## 🚨 Critical Success Factors

1. ✓ Socratic method is preserved (AI guides, doesn't answer)
2. ✓ Student data is protected (LGPD/GDPR compliant)
3. ✓ Personalization works (right content for right student)
4. ✓ All 4 roles work (student, parent, teacher, director)
5. ✓ Educational outcomes are measurable

## 🤝 Using Claude Code

This project is designed to work with Claude Code as your senior engineer.

**Claude Code Commands**:
- `/plan` - Design new features or architecture
- `/code-review ultra` - Comprehensive review before merging
- `/codebase-design` - Evaluate architecture decisions
- `/diagnosing-bugs` - Debug complex pedagogical issues
- `/design` - Create UI mockups and flows

**Custom Skills** (to be created):
- `pedagogical-review` - Verify socratic method preserved
- `privacy-audit` - Check for data leaks
- `role-access-check` - Verify permission boundaries

## 📞 Communication

- **Questions?** Check `docs/` first
- **Bug?** Use `/diagnosing-bugs`
- **Architecture?** Use `/codebase-design`
- **Code Review?** Use `/code-review ultra`
- **Stuck?** Ask in team channel with context

---

**Last Updated**: 2026-09-03  
**Phase**: Foundation & Setup  
**Status**: 🔨 Building Core Architecture
