# Database Schema

ChatGenius uses AWS DynamoDB as its primary database. Below are the table schemas and their relationships.

## Tables

### Users Table
Stores user account information.
```typescript
{
  email: string;        // Partition Key
  password: string;     // Hashed password
  createdAt: string;    // ISO timestamp
}
```

### Workspaces Table
Stores workspace information and member relationships.
```typescript
{
  id: string;          // Partition Key (UUID)
  name: string;        // Workspace name
  ownerId: string;     // Email of workspace owner
  members: {           // Array of workspace members
    userId: string;    // Member's email
    role: 'owner' | 'admin' | 'member';
    lastVisited?: string;  // ISO timestamp
  }[];
  invites: string[];   // Array of invited user emails
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp
}
```

### Channels Table
Stores channel information within workspaces.
```typescript
{
  workspaceId: string;  // Partition Key
  id: string;          // Sort Key (UUID)
  name: string;        // Channel name
  isPrivate: boolean;  // Channel visibility
  position: number;    // Channel order position
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp
}
```

### Messages Table
Stores messages within channels.
```typescript
{
  channelId: string;   // Partition Key
  timestamp: string;   // Sort Key (ISO timestamp)
  userId: string;      // Sender's email
  content: string;     // Message content
  attachments?: string[]; // Array of S3 file URLs
  edited?: boolean;    // Whether message was edited
  threadCount?: number; // Number of thread replies
}
```

## Access Patterns

### Users
- Get user by email (auth)
- Create new user (signup)

### Workspaces
- Get workspace by ID
- List user's workspaces (by member email)
- Update workspace settings
- Add/remove members
- Update last visited timestamp

### Channels
- List channels in workspace
- Get channel by ID
- Create new channel
- Update channel order
- Delete channel

### Messages
- Get messages in channel (with pagination)
- Send new message
- Edit message
- Delete message
- Add attachments

## Indexes

### Workspaces Table
- Primary Key: `id`
- GSI1: `members` (for querying user's workspaces)

### Channels Table
- Primary Key: `(workspaceId, id)`
- LSI1: `position` (for ordered listing)

### Messages Table
- Primary Key: `(channelId, timestamp)`
- GSI1: `userId` (for user's message history)

## Data Relationships

```
User (email)
  │
  ├─▶ Workspace (member)
  │     │
  │     ├─▶ Channel
  │     │     │
  │     │     └─▶ Message
  │     │
  │     └─▶ Member (role)
  │
  └─▶ Workspace Invite
```

## Data Consistency

- Workspace membership is managed through atomic updates
- Channel ordering uses optimistic concurrency
- Message timestamps use ISO format for consistent sorting
- File references are stored as S3 URLs in messages

## Backup and Recovery

- Point-in-time recovery enabled for all tables
- Daily backups with 35-day retention
- Cross-region replication (planned)

## Performance Considerations

- Messages are partitioned by channelId for efficient retrieval
- Channel listing is optimized with position attribute
- Workspace queries use GSI for member lookups
- Pagination implemented for message history 