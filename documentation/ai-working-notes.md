# AI Working Notes

## Current Task: Channel Activity Summary Implementation (Phase 5)

### Overview
Implementing an AI-powered channel activity summary feature that provides users with a concise overview of missed messages and activities since their last visit to a channel.

### Data Model Analysis
1. Relevant Schema:
   - ChannelMembership table tracks lastReadMessageId and lastReadTimestamp
   - Messages table contains channel history
   - Threads table contains thread discussions
   - Attachments stored in message records

### Implementation Plan

1. Backend Infrastructure (Week 1)
   - OpenAI Integration
     - Setup OpenAI client with API key
     - Implement retry logic and error handling
     - Add rate limiting middleware
     - Create summary generation service
   - Message Processing
     - Query messages since lastReadTimestamp
     - Aggregate thread activities
     - Group messages by context/topic
     - Extract key files and links

2. Summary Generation (Week 1-2)
   - Core Summarization
     - Design prompt engineering for channel context
     - Implement hierarchical summarization
       - High-level channel overview
       - Detailed thread summaries
       - Key decisions/actions list
     - Handle different message types
       - Text messages
       - Code snippets
       - File attachments
       - Thread discussions

3. API Development (Week 2)
   - New Endpoints:
     ```typescript
     POST /api/ai/channel-summary
     Body: {
       channelId: string,
       workspaceId: string,
       since: string // timestamp
     }
     ```
   - Background Processing:
     - Queue system for long-running summaries
     - Webhook for completion notification
   - Caching Layer:
     - Store generated summaries
     - Implement cache invalidation
     - Handle incremental updates

4. Frontend Integration (Week 2-3)
   - UI Components:
     - Summary modal on workspace entry
     - Per-channel summary view
     - Loading and error states
   - State Management:
     - Track summary requests
     - Handle background updates
     - Manage caching

5. Performance & Security (Week 3)
   - Optimization:
     - Implement summary caching
     - Add background processing
     - Optimize message queries
   - Security:
     - Add rate limiting per user
     - Implement access control
     - Add audit logging

### Current Focus: Summary Generation
Starting implementation of the summary generation service to process channel activity into useful summaries.

#### Step 1: Message Processing (Completed)
- ✅ Implemented message history extraction
- ✅ Added thread context aggregation
- ✅ Handled file attachments
- ✅ Grouped user activities

#### Step 2: Summary Generation (In Progress)

1. Design Decisions:
   - Use GPT-4 for high-quality summaries
   - Implement hierarchical summarization:
     - High-level channel overview
     - Key topics and decisions
     - Thread summaries
     - File references
   - Structure output as JSON for consistent UI rendering

2. Implementation Plan:
   a. Create summary generation service
      - Prompt engineering for channel context
      - Message grouping by topics
      - Thread summarization
      - Action item extraction
   b. Add caching layer
      - Cache summaries by channel and timestamp
      - Implement incremental updates
   c. Implement background processing
      - Queue system for long summaries
      - Progress tracking
      - Real-time updates

3. Files to Create:
   - `app/utils/ai/summary-generator.ts` - Core summarization logic
   - `app/utils/ai/prompts.ts` - Prompt templates
   - `app/utils/ai/cache-manager.ts` - Summary caching
   - `app/api/ai/channel-summary/route.ts` - API endpoint

4. Next Actions:
   - Create summary generator utility
   - Design and implement prompt templates
   - Add summary caching

### Technical Considerations
- Balance between summary detail and token usage
- Handle rate limits and costs
- Ensure summary quality and relevance
- Consider incremental updates for long channels

### Dependencies
- OpenAI API access
- Channel membership system
- Message history access
- User session management

### Implementation Progress

#### Step 1: OpenAI Infrastructure (Completed)

1. Environment Setup ✅
   - Created required environment variables structure
   - Implemented configuration management
   - Added type definitions

2. Implementation Steps:
   a. ✅ Created OpenAI client utility
      - Singleton pattern for client management
      - Configuration handling
      - Completion generation interface
   b. ✅ Implemented rate limiting
      - Token bucket algorithm
      - Configurable RPM
      - Singleton pattern
   c. ✅ Added error handling and retries
      - Exponential backoff with jitter
      - Error classification
      - Retry logic for transient errors
   d. Pending: Setup monitoring

3. Files Created:
   - ✅ `app/types/openai.ts` - Type definitions
   - ✅ `app/utils/openai/client.ts` - OpenAI client
   - ✅ `app/utils/openai/rate-limiter.ts` - Rate limiting
   - ✅ `app/utils/openai/error-handling.ts` - Error handling

#### Step 2: Message Processing (Next Up)

1. Planning:
   - Design message extraction service
   - Plan thread context aggregation
   - Design activity grouping logic

2. Files to Create:
   - `app/utils/ai/message-processor.ts` - Message processing logic
   - `app/utils/ai/thread-aggregator.ts` - Thread context handling
   - `app/utils/ai/activity-grouper.ts` - User activity grouping

3. Next Actions:
   - Create message processor utility
   - Implement message history extraction
   - Add thread context aggregation

## Current Task: Thread Implementation (Phase 2)

### Initial Setup Status
1. WebSocket Infrastructure ✅
   - Added thread message types to WebSocketMessage interface
   - Implemented sendThreadMessage hook
   - Created thread_message handler
   - Added real-time thread count updates

### Implementation Plan
1. Thread UI Components (Next Steps)
   - Create ThreadSidebar.tsx
     - Sliding panel layout
     - Thread header with parent message
     - Thread message list
     - Reply input component
   - Update Message.tsx
     - Add thread indicator
     - Thread start/reply button
     - Thread preview
   - Create ThreadMessage.tsx
     - Thread reply layout
     - Reply metadata
     - Reply actions

2. Thread Backend Implementation
   - Create API routes:
     - POST /api/messages/{messageId}/thread
     - GET /api/messages/{messageId}/thread
     - DELETE /api/messages/{messageId}/thread/{replyId}
   - Update DynamoDB operations:
     - Thread creation
     - Reply management
     - Thread count tracking

3. Thread Features
   - Implement reply count tracking
   - Add thread participant list
   - Setup thread notifications
   - Add thread resolution status

### Current Focus
- Starting with ThreadSidebar.tsx component
- Will implement basic thread viewing functionality
- Following project-checklist.md Phase 2 order

### Notes
- Using existing WebSocket infrastructure
- Following same real-time pattern as main messages
- Maintaining consistent UI patterns
- Ensuring dark mode compatibility
- Following accessibility standards

## Current Task: Direct Messages Implementation

### Implementation Plan

1. DM Infrastructure
   - Create DM utilities:
     - `getDMChannelId(user1: string, user2: string)` - Returns consistent channel ID
     - `isDMChannel(channelId: string)` - Checks if channel is a DM
     - `getDMParticipants(channelId: string)` - Extracts user IDs from DM channel
   - Use existing message infrastructure:
     - Reuse `/api/messages/[id]` for DM messages
     - Leverage WebSocket for real-time updates
     - Utilize existing DynamoDB tables

2. DM UI Components
   - Add DM section to Sidebar.tsx
     - DM conversations list
     - Online/offline status
     - Unread indicators
   - Create DMUserSelect component
     - User search/filtering
     - Recent conversations
   - Update WorkspaceClient.tsx
     - Handle DM channel routing
     - DM-specific message display
     - DM user status display

3. DM Features
   - Cross-workspace DM support
     - Consistent channel IDs
     - Global user presence
   - Real-time updates
     - Message delivery (using existing WebSocket)
     - Typing indicators
     - Read receipts
   - DM notifications
     - Unread counts
     - Push notifications

4. Performance Optimizations
   - Message caching
   - Conversation pagination
   - Efficient presence updates

### Current Focus
- Creating DM utility functions
- Implementing DM UI components
- Following project-checklist.md Phase 2 order

### Notes
- Reusing existing WebSocket infrastructure
- No need for new API routes or tables
- Maintaining consistent message format
- Following security best practices

## Current Task: Read Receipts Implementation

### Implementation Plan

1. Data Model & Storage
   - Add `last_read_message_id` field to channel membership records
   - Store in DynamoDB with composite key: `{channelId}#{userId}`
   - Update on message view or explicit read action
   - Track per-channel read status

2. Backend Implementation
   - New API routes:
     - POST /api/messages/read - Mark messages as read
     - GET /api/messages/read-status - Get read status for channel
   - WebSocket events:
     - `read_receipt` - Broadcast when user reads messages
     - `read_status_update` - Real-time read status updates

3. Frontend Implementation
   - Add read status tracking to message list
   - Visual indicators:
     - Unread message divider
     - Last read timestamp
     - Read/unread status per message
   - Automatic read updates on message view
   - Manual read status sync on reconnect

4. Performance Considerations
   - Batch read status updates
   - Optimize read status queries
   - Cache read receipts client-side
   - Debounce read status broadcasts

### Technical Details
- Read status tracked per user per channel
- Real-time updates via existing WebSocket
- Optimistic UI updates for better UX
- Consistent read status across devices
- Handle offline/reconnection scenarios

### Dependencies
- Existing WebSocket infrastructure
- Channel membership system
- Message tracking system
- User session management

Would you like me to proceed with this implementation plan?