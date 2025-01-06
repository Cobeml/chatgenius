# ChatGenius Technical Specification

For a baseline reference app, consider Slack - it is the dominant tool in this space, providing excellent UX and integration with a rich ecosystem.

## Core Features & Technical Implementation

### 1. Authentication
- Next.js Authentication using NextAuth.js
- Support for multiple providers (Google, GitHub, Email/Password)
- JWT-based session management
- AWS Cognito as identity provider (optional)

### 2. Real-time Messaging
- WebSocket implementation using Socket.io
- AWS API Gateway WebSocket API for scalable connections
- Message persistence in AWS DynamoDB
- Message delivery status and read receipts

### 3. Channel/DM Organization
- DynamoDB data model for:
  - Workspaces
  - Channels (public/private)
  - Direct Messages
  - User-Channel relationships
- Real-time channel presence using Socket.io
- Channel membership management

### 4. File Sharing & Search
- AWS S3 for file storage
- File type validation and size limits
- Image preview generation using AWS Lambda
- Elastic Search for full-text search capabilities
- File metadata storage in DynamoDB

### 5. User Presence & Status
- Real-time status updates via WebSocket
- Custom status messages
- Last seen tracking
- Away/Active status automation
- DynamoDB TTL for presence data

### 6. Thread Support
- Threaded conversation data model in DynamoDB
- Real-time thread updates
- Thread notification system
- Unread count tracking

### 7. Emoji Reactions
- Emoji picker integration
- Real-time reaction updates
- Reaction aggregation

## Tech Stack Details

### Frontend
- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS for styling
- Socket.io-client for real-time features
- React Query for data fetching
- Zustand for state management

### Backend
- Next.js API Routes
- Socket.io for WebSocket handling
- AWS Services:
  - DynamoDB for main database
  - S3 for file storage
  - ElasticSearch for search functionality
  - Lambda for file processing
  - API Gateway for WebSocket API

### Infrastructure
- Vercel for hosting and deployment
- AWS for cloud services
- GitHub Actions for CI/CD
- AWS CloudFront for CDN

### Database Schema (DynamoDB)

#### Main Tables:
- Users
- Workspaces
- Channels
- Messages
- ThreadMessages
- Reactions
- FileMetadata
- ChannelMembers

## Development Phases

1. Phase 1: Core Infrastructure
   - Authentication
   - Basic messaging
   - Channel creation

2. Phase 2: Real-time Features
   - WebSocket integration
   - Presence system
   - Direct messages

3. Phase 3: Rich Features
   - File sharing
   - Search functionality
   - Thread support

4. Phase 4: Enhancement
   - Emoji reactions
   - Rich text editor
   - Message formatting

## Performance Considerations

- Implement pagination for message history
- Use optimistic updates for better UX
- Implement message queuing for offline support
- Use AWS CloudFront for static assets
- Implement caching strategies


