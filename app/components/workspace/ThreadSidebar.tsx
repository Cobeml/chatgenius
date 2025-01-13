import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useWebSocket } from '@/hooks/useWebSocket';
import { formatRelativeTime } from '@/lib/utils';

interface ThreadMessage {
  messageId: string;
  parentMessageId: string;
  content: string;
  userId: string;
  timestamp: string;
  attachments?: string[];
}

interface ThreadSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  parentMessage: {
    id: string;
    content: string;
    userId: string;
    timestamp: string;
    attachments?: string[];
  };
  workspaceId: string;
}

export function ThreadSidebar({ isOpen, onClose, parentMessage, workspaceId }: ThreadSidebarProps) {
  const { data: session } = useSession();
  const { sendThreadMessage, lastMessage } = useWebSocket(workspaceId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [replyContent, setReplyContent] = useState('');
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);

  // Handle new thread messages
  useEffect(() => {
    if (lastMessage?.type === 'thread_message' && lastMessage.parentMessageId === parentMessage.id) {
      setThreadMessages(prev => [...prev, {
        messageId: lastMessage.messageId!,
        parentMessageId: lastMessage.parentMessageId!,
        content: lastMessage.content!,
        userId: lastMessage.userId!,
        timestamp: lastMessage.timestamp!,
        attachments: lastMessage.attachments
      }]);
    }
  }, [lastMessage, parentMessage.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threadMessages]);

  // Handle reply submission
  const handleReply = () => {
    if (!replyContent.trim()) return;
    
    sendThreadMessage(parentMessage.id, replyContent);
    setReplyContent('');
  };

  // Handle enter key for reply
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  };

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
    <div
      className={`fixed inset-y-0 right-0 w-96 bg-background border-l transform transition-transform duration-200 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="h-16 border-b flex items-center justify-between px-4">
        <h2 className="text-lg font-semibold">Thread</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent Message */}
      <div className="p-4 border-b">
        <div className="flex items-start space-x-3">
          <Avatar>
            <AvatarFallback>{parentMessage.userId[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium">{parentMessage.userId}</span>
              <span className="text-muted-foreground text-sm">
                {formatRelativeTime(parentMessage.timestamp)}
              </span>
            </div>
            <p className="text-sm">{parentMessage.content}</p>
            {renderAttachments(parentMessage.attachments)}
          </div>
        </div>
      </div>

      {/* Thread Messages */}
      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="p-4 space-y-4" ref={scrollRef}>
          {threadMessages.map((message) => (
            <div key={message.messageId} className="flex items-start space-x-3">
              <Avatar>
                <AvatarFallback>{message.userId[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{message.userId}</span>
                  <span className="text-muted-foreground text-sm">
                    {formatRelativeTime(message.timestamp)}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>
                {renderAttachments(message.attachments)}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Reply Input */}
      <div className="h-16 border-t p-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Reply in thread..."
            className="flex-1 bg-muted rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button size="sm" onClick={handleReply}>Reply</Button>
        </div>
      </div>
    </div>
  );
} 