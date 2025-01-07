'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { MessageInput } from "@/app/components/workspace/MessageInput";
import { InviteModal } from "@/app/components/workspace/InviteModal";
import { useSearchParams } from 'next/navigation';
import { Download, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface Channel {
  id: string;
  name: string;
  isPrivate: boolean;
  position: number;
}

interface Message {
  channelId: string;
  timestamp: string;
  userId: string;
  content: string;
  attachments?: string[];
}

interface WorkspaceClientProps {
  workspaceId: string;
  userRole: 'owner' | 'admin' | 'member';
}

export default function WorkspaceClient({ workspaceId, userRole }: WorkspaceClientProps) {
  const searchParams = useSearchParams();
  const selectedChannelId = searchParams.get('channel');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  const fetchMessages = async () => {
    if (!selectedChannelId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/messages/${selectedChannelId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      
      // Add debug logging
      console.log('Retrieved messages:', data);
      
      // Sort messages with oldest at the top
      setMessages(data.sort((a: Message, b: Message) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ));
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChannelDetails = async () => {
    if (!selectedChannelId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/channels/${selectedChannelId}?workspaceId=${workspaceId}`);
      if (!response.ok) throw new Error('Failed to fetch channel');
      const data = await response.json();
      setCurrentChannel(data);
    } catch (error) {
      console.error('Error fetching channel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedChannelId && workspaceId) {
      fetchChannelDetails();
      fetchMessages();
    }
  }, [selectedChannelId, workspaceId]);

  const handleFileDownload = (fileUrl: string) => {
    const downloadUrl = `/api/download?file=${encodeURIComponent(fileUrl)}`;
    window.open(downloadUrl, '_blank');
  };

  const getFileNameFromUrl = (url: string) => {
    return url.split('/').pop() || 'file';
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="h-12 min-h-[3rem] border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className="hover:bg-gray-100 p-1 rounded-md transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-semibold">{currentChannel?.name || 'Select a channel'}</h1>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="btn"
            >
              Invite Users
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {messages.map((message, index) => {
            const previousMessage = messages[index - 1];
            const showHeader = !previousMessage || previousMessage.userId !== message.userId;

            return (
              <div key={message.timestamp} className="flex flex-col">
                {showHeader && (
                  <span className="text-xs text-gray-500 mt-2 mb-1">{message.userId}</span>
                )}
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5 text-sm text-foreground inline-block max-w-[85%]">
                      {message.content}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {message.attachments.map((fileUrl, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleFileDownload(fileUrl)}
                              className="flex items-center gap-1 text-xs text-pink-700 hover:text-pink-500"
                            >
                              <Download className="h-3 w-3" />
                              {getFileNameFromUrl(fileUrl)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 pt-1">
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-2 border-t">
        <MessageInput 
          channelId={selectedChannelId || ''}
          onMessageSent={fetchMessages} 
        />
      </div>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        workspaceId={workspaceId}
      />
    </div>
  );
} 