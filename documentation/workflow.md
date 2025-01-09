# Development Workflows

## Core Rules

1. **Documentation Priority**

   - Follow hierarchy exactly:
     1. workflow.md
     2. project-checklist.md
     3. Task-specific docs
   - Document all changes in ai-working-notes.md

2. **Task Management**
   - One task at a time
   - Follow project-checklist.md phases
   - Get explicit approval for phase transitions
   - Maintain ai-working-notes.md

## Development Phases

1. **Planning**

   - Review project-checklist.md
   - Document in ai-working-notes.md
   - Get user confirmation

2. **Implementation**

   - Follow project-checklist.md steps
   - Document in ai-working-notes.md
   - Run required tests
   - Get user confirmation

3. **Documentation**

   - Update affected docs
   - Verify against project-checklist.md
   - Document completion in ai-working-notes.md

4. **Review**
   - Verify project-checklist.md requirements
   - Get user approval
   - Clean ai-working-notes.md for next task

## Phase Transitions

### Phase 1 ✅ → Phase 2 🟡

1. **Completion Verification**
   - All Phase 1 items marked complete
   - Documentation updated
   - Tests passing
   - User approval received

2. **Phase 2 Preparation**
   - WebSocket infrastructure setup
   - Real-time feature planning
   - Documentation updates
   - Development environment ready

### Current Focus: Phase 2 🟡

1. **Real-time Features**
   - WebSocket API implementation
   - Connection management
   - Presence system
   - Direct messaging

2. **Documentation**
   - Update progress in project-checklist.md
   - Maintain ai-working-notes.md
   - Update technical documentation

## Quality Standards

1. **Code Quality**
   - TypeScript strict mode
   - ESLint compliance
   - Proper error handling
   - Comprehensive testing

2. **Documentation**
   - Keep documentation in sync
   - Clear and concise updates
   - Cross-reference between docs
   - Version control

3. **UI/UX**
   - Consistent design patterns
   - Dark mode compatibility
   - Responsive layouts
   - Accessibility standards

## Review Process

1. **Code Review**
   - TypeScript compliance
   - Best practices
   - Performance considerations
   - Security checks

2. **Documentation Review**
   - Accuracy check
   - Completeness
   - Cross-references
   - Version alignment

3. **Testing**
   - Unit tests
   - Integration tests
   - UI/UX verification
   - Performance testing

[Additional workflows referenced in project-checklist.md]