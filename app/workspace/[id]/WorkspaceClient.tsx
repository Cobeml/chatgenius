'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { MessageInput } from "@/app/components/workspace/MessageInput";
import { InviteModal } from "@/app/components/workspace/InviteModal";
import { useSearchParams } from 'next/navigation';
import { Download, LogOut, Settings, Hash, Lock, X } from 'lucide-react';
import Link from 'next/link';
import { ChannelSettingsModal } from "@/app/components/workspace/ChannelSettingsModal";
import { useSession } from "next-auth/react";
import { useWebSocket } from '@/app/hooks/useWebSocket';

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
  edited?: boolean;
}

interface WorkspaceClientProps {
  workspaceId: string;
}

export default function WorkspaceClient({ workspaceId }: WorkspaceClientProps) {
  const searchParams = useSearchParams();
  const selectedChannelId = searchParams.get('channel');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChannelSettingsOpen, setIsChannelSettingsOpen] = useState(false);
  const { data: session } = useSession();
  const [workspace, setWorkspace] = useState<{ userRole?: string }>({});
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({});
  const [onlineUsers, setOnlineUsers] = useState<{ [key: string]: string }>({});
  const { isConnected, lastMessage, sendMessage, updatePresence, updateTyping } = useWebSocket(workspaceId);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const isAdmin = workspace?.userRole === 'owner' || workspace?.userRole === 'admin';

  const fetchMessages = useCallback(async () => {
    if (!selectedChannelId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/messages/${selectedChannelId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      
      // Sort messages with newest at the bottom
      setMessages(data.sort((a: Message, b: Message) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ));
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedChannelId]);

  const fetchChannelDetails = useCallback(async () => {
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
  }, [selectedChannelId, workspaceId]);

  useEffect(() => {
    if (selectedChannelId) {
      fetchMessages();
      fetchChannelDetails();
    }
  }, [selectedChannelId, fetchMessages, fetchChannelDetails]);

  useEffect(() => {
    const updateLastVisited = async () => {
      try {
        await fetch(`/api/workspaces/${workspaceId}/last-visited`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('Failed to update last visited:', error);
      }
    };

    // Update last visited when component mounts
    updateLastVisited();
  }, [workspaceId]);

  useEffect(() => {
    const fetchWorkspaceDetails = async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}`);
        if (!response.ok) throw new Error('Failed to fetch workspace');
        const data = await response.json();
        setWorkspace(data);
      } catch (error) {
        console.error('Error fetching workspace:', error);
      }
    };

    fetchWorkspaceDetails();
  }, [workspaceId]);

  const handleFileDownload = (fileUrl: string) => {
    const downloadUrl = `/api/download?file=${encodeURIComponent(fileUrl)}`;
    window.open(downloadUrl, '_blank');
  };

  const getFileNameFromUrl = (url: string) => {
    const fileName = url.split('/').pop() || 'file';
    // Remove the timestamp prefix (e.g., "1736537504597-")
    return fileName.replace(/^\d+-/, '');
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId: selectedChannelId,
          content
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit message');
      }

      await fetchMessages();
      setEditingMessage(null);
      setEditContent('');
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}?channelId=${selectedChannelId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      await fetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    console.log('Processing WebSocket message:', lastMessage);

    switch (lastMessage.type) {
      case 'message':
        if (lastMessage.channelId === selectedChannelId) {
          console.log('Adding new message to state:', lastMessage);
          
          setMessages(prev => {
            // Create new message object
            const newMessage = {
              channelId: lastMessage.channelId!,
              timestamp: lastMessage.timestamp || new Date().toISOString(),
              userId: lastMessage.connectionId || session?.user?.email || 'unknown',
              content: lastMessage.content!,
              attachments: lastMessage.attachments
            };

            // Check if message already exists
            const messageExists = prev.some(m => 
              m.content === newMessage.content && 
              m.userId === newMessage.userId &&
              // Messages within 1 second are considered duplicates
              Math.abs(new Date(m.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 1000
            );
            
            if (messageExists) {
              console.log('Message already exists, skipping');
              return prev;
            }
            
            console.log('Created new message:', newMessage);
            
            // Add new message and keep sorted with newest at the bottom
            return [...prev, newMessage].sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          });
        }
        break;
      case 'presence':
        if (lastMessage.connectionId && lastMessage.status) {
          setOnlineUsers(prev => ({
            ...prev,
            [lastMessage.connectionId!]: lastMessage.status!
          }));
        }
        break;
      case 'typing':
        if (lastMessage.connectionId && lastMessage.channelId === selectedChannelId) {
          if (lastMessage.isTyping) {
            setTypingUsers(prev => ({
              ...prev,
              [lastMessage.connectionId!]: new Date().toISOString()
            }));
          } else {
            setTypingUsers(prev => {
              const updated = { ...prev };
              delete updated[lastMessage.connectionId!];
              return updated;
            });
          }
        }
        break;
    }
  }, [lastMessage, selectedChannelId, session?.user?.email]);

  // Clean up stale typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      setTypingUsers(prev => {
        const updated = { ...prev };
        Object.entries(updated).forEach(([id, timestamp]) => {
          if (now - new Date(timestamp).getTime() > 3000) {
            delete updated[id];
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update presence when component mounts/unmounts
  useEffect(() => {
    if (isConnected) {
      updatePresence('online');
    }

    return () => {
      if (isConnected) {
        updatePresence('offline');
      }
    };
  }, [isConnected, updatePresence]);

  // Handle typing status
  const handleTyping = useCallback((isTyping: boolean) => {
    if (selectedChannelId) {
      updateTyping(selectedChannelId, isTyping);
    }
  }, [selectedChannelId, updateTyping]);

  // Update message sending to use WebSocket
  const handleSendMessage = useCallback(async (content: string, attachments?: string[]) => {
    if (!selectedChannelId || !session?.user?.email) return;

    try {
      // Send via WebSocket for real-time delivery
      sendMessage(selectedChannelId, content, attachments);

      // Also store in DynamoDB for persistence
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannelId,
          content,
          workspaceId,
          attachments
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Clear typing indicator
      handleTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [selectedChannelId, session?.user?.email, sendMessage, workspaceId, handleTyping]);

  // Function to scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, []);

  // Check if user is near bottom when scrolling
  const handleScroll = useCallback(() => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isNearBottom);
    }
  }, []);

  // Scroll to bottom on initial load and channel change
  useEffect(() => {
    scrollToBottom();
  }, [selectedChannelId, scrollToBottom]);

  // Auto-scroll when new messages arrive if user was at bottom
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages, shouldAutoScroll, scrollToBottom]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="h-12 min-h-[3rem] border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {currentChannel?.isPrivate ? (
              <Lock className="h-5 w-5 text-foreground" />
            ) : (
              <Hash className="h-5 w-5 text-foreground" />
            )}
            <h1 className="font-semibold">{currentChannel?.name || 'Select a channel'}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && currentChannel && (
            <button
              onClick={() => setIsChannelSettingsOpen(true)}
              className="hover:bg-accent p-2 rounded-md transition-colors text-foreground"
            >
              <Settings className="h-5 w-5" />
            </button>
          )}
          <Link 
            href="/" 
            className="hover:bg-accent p-2 rounded-md transition-colors flex items-center gap-2 text-destructive hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm">Exit</span>
          </Link>
        </div>
      </div>

      <ScrollArea className="flex-1 relative">
        <div 
          ref={scrollAreaRef} 
          onScroll={handleScroll}
          className="p-2 space-y-1 h-full overflow-y-auto absolute inset-0"
        >
          <div className="space-y-1">
            {messages.map((message, index) => {
              const previousMessage = messages[index - 1];
              const showHeader = !previousMessage || previousMessage.userId !== message.userId;
              const isOwnMessage = message.userId === session?.user?.email;

              return (
                <div key={message.timestamp} className="flex flex-col group">
                  {showHeader && (
                    <span className="text-xs text-gray-500 mt-2 mb-1">{message.userId}</span>
                  )}
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      {editingMessage === message.timestamp ? (
                        <div className="flex items-end gap-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="flex-1 min-h-[60px] bg-white text-black p-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-hover"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditMessage(message.timestamp, editContent)}
                              className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingMessage(null);
                                setEditContent('');
                              }}
                              className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/90"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5 text-sm text-foreground inline-block max-w-[85%] relative group">
                          <div className="flex flex-col gap-1">
                            <span>{message.content}</span>
                            {message.edited && (
                              <span className="text-[10px] text-muted-foreground">(edited)</span>
                            )}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-xs text-pink-500">
                                  {getFileNameFromUrl(message.attachments[0])}
                                </span>
                                <button
                                  onClick={() => handleFileDownload(message.attachments![0])}
                                  className="flex items-center gap-1 text-xs text-pink-700 hover:text-pink-500"
                                >
                                  <Download className="h-3 w-3" />
                                  Download
                                </button>
                              </div>
                            )}
                          </div>
                          {isOwnMessage && (
                            <div className="absolute right-0 top-0 translate-x-[105%] opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingMessage(message.timestamp);
                                  setEditContent(message.content);
                                }}
                                className="p-1 hover:bg-accent rounded"
                              >
                                <Settings className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(message.timestamp)}
                                className="p-1 hover:bg-destructive/10 text-destructive rounded"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
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
            {Object.keys(typingUsers).length > 0 && (
              <div className="text-xs text-muted-foreground italic">
                {Object.keys(typingUsers).length === 1
                  ? 'Someone is typing...'
                  : `${Object.keys(typingUsers).length} people are typing...`}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="p-2 border-t">
        <MessageInput 
          channelId={selectedChannelId || ''}
          onMessageSent={handleSendMessage}
          onTyping={handleTyping}
        />
      </div>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        workspaceId={workspaceId}
      />

      {currentChannel && (
        <ChannelSettingsModal
          isOpen={isChannelSettingsOpen}
          onClose={() => setIsChannelSettingsOpen(false)}
          workspaceId={workspaceId}
          channelId={currentChannel.id}
          channelName={currentChannel.name}
          isPrivate={currentChannel.isPrivate}
        />
      )}
    </div>
  );
} 