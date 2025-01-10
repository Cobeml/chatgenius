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

## API Endpoints

### Authentication
- POST /api/auth/signup - User registration
- POST /api/auth/login - User authentication
- POST /api/auth/logout - User logout
- POST /api/auth/refresh - Refresh access token

### Users
- GET /api/users/me - Get current user profile
- PUT /api/users/me - Update user profile
- GET /api/users/:id - Get user by ID
- GET /api/users/search - Search users

### Workspaces
- POST /api/workspaces - Create new workspace
- GET /api/workspaces - List user's workspaces
- GET /api/workspaces/:id - Get workspace details
- PUT /api/workspaces/:id - Update workspace
- DELETE /api/workspaces/:id - Delete workspace
- POST /api/workspaces/:id/members - Add workspace member
- DELETE /api/workspaces/:id/members/:userId - Remove workspace member

### Channels
- POST /api/channels - Create new channel
- GET /api/channels - List channels in workspace
- GET /api/channels/:id - Get channel details
- PUT /api/channels/:id - Update channel
- DELETE /api/channels/:id - Delete channel
- POST /api/channels/:id/members - Add channel member
- DELETE /api/channels/:id/members/:userId - Remove channel member

### Messages
- POST /api/messages - Send new message
- GET /api/messages - Get messages in channel (with pagination)
- PUT /api/messages/:id - Edit message
- DELETE /api/messages/:id - Delete message
- POST /api/messages/:id/reactions - Add reaction
- DELETE /api/messages/:id/reactions/:type - Remove reaction

### Threads
- POST /api/threads - Create thread reply
- GET /api/threads/:messageId - Get thread messages
- PUT /api/threads/:id - Edit thread message
- DELETE /api/threads/:id - Delete thread message

### Files
- POST /api/files/upload - Upload file
- GET /api/files/:id - Get file metadata
- DELETE /api/files/:id - Delete file
- GET /api/files/download/:id - Download file

### Search
- GET /api/search/messages - Search messages
- GET /api/search/files - Search files

### WebSocket Endpoints
- ws://api/ws
  Handles:
  - User presence
  - Real-time message delivery
  - Typing indicators
  - Online status updates
  - Message reactions
  - Thread notifications
