import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { formatRelativeTime, getAvatarColor } from '@/lib/utils';
import { ThreadSidebar } from './ThreadSidebar';

interface MessageProps {
  id: string;
  content: string;
  userId: string;
  timestamp: string;
  attachments?: string[];
  threadCount?: number;
  workspaceId: string;
}

export function Message({ id, content, userId, timestamp, attachments, threadCount = 0, workspaceId }: MessageProps) {
  const [isThreadOpen, setIsThreadOpen] = useState(false);

  // Render attachment list
  const renderAttachments = (attachments?: string[]) => {
    if (!attachments?.length) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {attachments.map((attachment, index) => (
          <div
            key={index}
            className="bg-muted px-2 py-1 rounded text-xs text-muted-foreground"
          >
            {attachment}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="group relative flex items-start space-x-3 px-4 py-2 hover:bg-accent/5">
        <Avatar>
          <AvatarFallback className={getAvatarColor(userId)}>
            {userId[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{userId}</span>
            <span className="text-muted-foreground text-sm">
              {formatRelativeTime(timestamp)}
            </span>
          </div>
          <p className="text-sm">{content}</p>
          {renderAttachments(attachments)}
          
          {/* Thread Preview */}
          {threadCount > 0 && (
            <button
              onClick={() => setIsThreadOpen(true)}
              className="mt-2 flex items-center space-x-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              <span>{threadCount} {threadCount === 1 ? 'reply' : 'replies'}</span>
            </button>
          )}
        </div>

        {/* Thread Action Button */}
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsThreadOpen(true)}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>

      {/* Thread Sidebar */}
      <ThreadSidebar
        isOpen={isThreadOpen}
        onClose={() => setIsThreadOpen(false)}
        parentMessage={{
          id,
          content,
          userId,
          timestamp,
          attachments
        }}
        workspaceId={workspaceId}
      />
    </>
  );
} 