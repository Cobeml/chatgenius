# API Reference

## Authentication

### POST `/api/auth/signup`
Create a new user account.
```typescript
Request:
{
  email: string;
  password: string;
}

Response:
{
  message: string;
}
```

### POST `/api/auth/[...nextauth]`
NextAuth.js authentication endpoint handling signin/signout.

## Workspaces

### POST `/api/workspaces`
Create a new workspace.
```typescript
Request:
{
  name: string;
  members?: { userId: string; role: 'member' }[];
  invites?: string[];
}

Response:
{
  id: string;
  name: string;
  members: { userId: string; role: string }[];
  ownerId: string;
}
```

### GET `/api/workspaces/[id]`
Get workspace details.
```typescript
Response:
{
  id: string;
  name: string;
  members: { userId: string; role: string }[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
```

### PATCH `/api/workspaces/[id]`
Update workspace settings.
```typescript
Request:
{
  name?: string;
  members?: { userId: string; role: string }[];
}
```

### POST `/api/workspaces/[id]/last-visited`
Update workspace last visited timestamp.

### GET `/api/workspaces/[id]/members`
Get workspace members.
```typescript
Response:
{
  email: string;
  role: 'owner' | 'admin' | 'member';
}[]
```

## Channels

### POST `/api/channels`
Create a new channel.
```typescript
Request:
{
  workspaceId: string;
  name: string;
}

Response:
{
  id: string;
  workspaceId: string;
  name: string;
  isPrivate: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}
```

### GET `/api/channels?workspaceId=[id]`
Get channels in a workspace.
```typescript
Response:
Channel[]
```

### GET `/api/channels/[id]?workspaceId=[workspaceId]`
Get channel details.
```typescript
Response:
{
  id: string;
  workspaceId: string;
  name: string;
  isPrivate: boolean;
  position: number;
}
```

### POST `/api/channels/reorder`
Reorder channels in a workspace.
```typescript
Request:
{
  workspaceId: string;
  channels: { id: string; position: number }[];
}
```

## Messages

### POST `/api/messages`
Send a new message.
```typescript
Request:
{
  channelId: string;
  content: string;
  attachments?: string[];
}

Response:
{
  channelId: string;
  timestamp: string;
  userId: string;
  content: string;
  attachments?: string[];
}
```

### GET `/api/messages/[channelId]`
Get messages in a channel.
```typescript
Response:
{
  channelId: string;
  timestamp: string;
  userId: string;
  content: string;
  attachments?: string[];
}[]
```

## Files

### POST `/api/upload`
Upload a file.
```typescript
Request:
FormData with:
- file: File
- channelId: string

Response:
{
  success: true;
  fileUrl: string;
}
```

### GET `/api/download?file=[fileKey]`
Download a file.
```typescript
Response:
Redirects to signed S3 URL
```

## Invites

### PUT `/api/user/workspace-invites`
Send workspace invites.
```typescript
Request:
{
  workspaceId: string;
  emails: string[];
}

Response:
{
  success: true;
  addedInvites: string[];
}
```

### POST `/api/workspaces/accept-invite`
Accept a workspace invite.
```typescript
Request:
{
  workspaceId: string;
}

Response:
{
  success: true;
}
```

### POST `/api/workspaces/deny-invite`
Deny a workspace invite.
```typescript
Request:
{
  workspaceId: string;
}

Response:
{
  success: true;
} 