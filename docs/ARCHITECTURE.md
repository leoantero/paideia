# Yellow AI Architecture

## System Overview

Yellow AI is a B2B educational platform with multi-role support. The system architecture supports 4 distinct user types with different interfaces and capabilities.

## Core Components

### 1. User Profile & Authentication Layer
- **Responsibility**: Manage users across 4 roles (student, parent, teacher, director)
- **Critical**: Row-level security enforcement
- **Design Decision**: Use role-based access control (RBAC) with clear boundaries
- **Privacy**: Minimal data collection; student data only visible to authorized users

### 2. Tutoring Engine (Socratic Method)
- **Responsibility**: Generate educational responses that guide students through learning
- **Method**: Questions and guidance, never direct answers
- **Integration**: RAG-based approach using curriculum content
- **Personalization**: Adapts by subject, grade level, and learning history
- **Key Constraint**: Preserve socratic method in all responses

### 3. Spaced Repetition System
- **Responsibility**: Track learning intervals and serve flashcards at optimal times
- **Algorithm**: Based on spaced repetition research (e.g., Leitner system)
- **Daily Goals**: 5 min (Elementary I), 10 min (Elementary II), 20 min (High School)
- **Feedback Loop**: Difficulty adjusts based on success/failure patterns

### 4. Performance Analytics
- **Responsibility**: Calculate and track student learning metrics
- **Consumers**: Parents (simplified), Teachers (detailed), Directors (aggregate)
- **Privacy**: Never show detailed wrong answers; only trends and weak areas
- **Metrics Tracked**: Subject mastery, completion patterns, learning velocity

### 5. Gamification System
- **Responsibility**: Motivate through achievement tracking
- **Mechanic**: Coins earned → Character customization
- **Design**: Educational value-driven (not addictive)
- **Usage**: Visible in student interface only

### 6. Teacher Support Tools
- **Responsibility**: Reduce teacher workload + provide student insights
- **Features**: Student-focused chatbot, test question generation
- **Data**: Access to student questions asked, common misconceptions

### 7. Admin Dashboard
- **Responsibility**: Provide directors with school-level performance metrics
- **Scope**: Student performance aggregates + staff performance metrics
- **Privacy**: Aggregate only; no individual student details

## Data Model (Conceptual)

```
User (id, email, role)
├── Student (grade_level, school, learning_history[])
│   ├── PerformanceMetrics (subject, mastery_score, timestamp)
│   ├── LearningHistory (concept, attempts, successes, last_reviewed)
│   ├── GamificationState (coins, character_customization)
│   └── AcademicRecords (absences, grades_by_subject)
├── Parent (linked_student, permissions)
│   └── ChildPerformanceDashboard (aggregated_metrics)
├── Teacher (school, students_class)
│   └── StudentInsights (class_performance, common_misconceptions)
└── Director (school)
    └── SchoolAnalytics (student_aggregates, staff_performance)
```

## Integration Points

### LLM Integration (Claude API)
- **Purpose**: Generate socratic responses for tutoring
- **Safety**: Use system prompts to enforce method
- **Fallback**: Pre-written guidance if LLM fails
- **Rate Limiting**: Implement to prevent abuse

### Curriculum Content (RAG)
- **Source**: Educational textbooks/curricula
- **Usage**: Ground LLM responses in actual curriculum
- **Update**: New school year → new curriculum loaded

### Spaced Repetition Algorithm
- **Input**: Student performance history
- **Output**: Next review time, difficulty level
- **Library**: Consider mature libraries (e.g., Anki algorithm)

## Deployment Architecture

```
Client (Web/Mobile)
    ↓
API Gateway (Auth + Role validation)
    ↓
Service Layer:
    ├── Tutoring Service (LLM calls + RAG)
    ├── Analytics Service (Metrics calculation)
    ├── Persistence Service (Database)
    ├── Personalization Service (User profile + history)
    └── Notification Service (Parent updates)
    ↓
Database (User data, performance metrics, learning history)
Database (Curriculum content for RAG)
LLM Provider (Claude API for tutoring)
```

## Security & Privacy Concerns

### Critical
- **LGPD/GDPR Compliance**: Student data is sensitive
- **Row-Level Security**: Students can only see their own data
- **Audit Logging**: Track all data access
- **Encryption**: Academic performance data at rest and in transit

### Important
- **Session Management**: Student sessions timeout (prevent unauthorized use)
- **Rate Limiting**: Prevent API abuse (especially tutoring chatbot)
- **Input Validation**: Sanitize all user inputs before processing
- **Error Handling**: Never expose PII in error messages

## Design Decisions

### Why Multi-Role UI?
Each role has different needs. Parents need quick performance summaries. Teachers need actionable insights. Directors need aggregate metrics. One-size-fits-all UI would confuse or overwhelm each group.

### Why RAG for Tutoring?
- Grounds responses in actual curriculum (prevents hallucination)
- Can cite specific sections of textbooks
- Enables exact personalization by grade level
- Makes socratic responses more precise

### Why Spaced Repetition?
- Evidence-based learning technique
- Maximizes retention with minimal time
- Fits the "5-20 min daily" constraint
- Can identify struggling concepts early

## Evolution Path

### Phase 1: MVP
- Basic student auth + tutoring chatbot
- Parent dashboard (simple performance view)
- Spaced repetition (basic)

### Phase 2: Enhancements
- Teacher tools (student insights + test generation)
- Gamification (character customization)
- Advanced analytics (weak area detection)

### Phase 3: Scale
- Director dashboard (school-level analytics)
- Mobile app
- Integration with school systems (gradebooks, attendance)

---

**Note**: This is a high-level overview. Implementation details (specific databases, cloud providers, exact API contracts) will be determined during development while maintaining pedagogical soundness and data privacy.
