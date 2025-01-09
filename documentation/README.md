# ChatGenius Documentation

ChatGenius is a real-time chat application built with Next.js and AWS, designed to provide a modern, scalable messaging platform for teams.

## Current Status

The project has completed Phase 1 (Core Infrastructure) and is working on Phase 2:

### Completed Features ✅
- Authentication
  - Email/Password login with NextAuth.js
  - JWT session management
  - Protected API routes
- Workspace Management
  - Create/Join workspaces
  - Invite system
  - Member roles (owner, admin, member)
  - Workspace settings
  - Last visited tracking
- Channel Management
  - Create/manage channels
  - Private channels
  - Channel settings
  - Drag-and-drop channel ordering
- Basic Messaging
  - Text messages with formatting
  - File attachments
  - Message history
  - Message editing/deletion
- File Handling
  - S3 integration
  - File uploads/downloads
  - File type validation
- Infrastructure
  - DynamoDB tables
  - S3 bucket configuration
  - IAM policies
  - CORS configuration

### In Progress 🟡
- WebSocket Integration
- Presence System
- Direct Messages

### Planned Features 📋
- Thread support
- Search functionality
- Rich text editing
- Message reactions
- Dark/light theme
- Mobile responsiveness
- Performance optimizations

## Documentation Structure

- [Technical Architecture](./architecture.md) - System design and technical stack
- [API Reference](./api-reference.md) - API endpoints and usage
- [Database Schema](./database-schema.md) - DynamoDB data models
- [Development Guide](./development-guide.md) - Setup and development workflow
- [AWS Infrastructure](./aws-infrastructure.md) - AWS services and configuration
- [Project Checklist](./project-checklist.md) - Development phases and progress
- [Workflow](./workflow.md) - Development workflows and processes 