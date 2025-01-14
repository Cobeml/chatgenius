# AI Working Notes

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