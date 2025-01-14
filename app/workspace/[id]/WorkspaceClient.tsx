'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { MessageInput } from "@/app/components/workspace/MessageInput";
import { InviteModal } from "@/app/components/workspace/InviteModal";
import { useSearchParams } from 'next/navigation';
import { Download, LogOut, Settings, Hash, Lock, X, MessageSquare, User } from 'lucide-react';
import Link from 'next/link';
import { ChannelSettingsModal } from "@/app/components/workspace/ChannelSettingsModal";
import { useSession } from "next-auth/react";
import { useWebSocket } from '@/app/hooks/useWebSocket';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { isDMChannel, getDMDisplayName } from "@/app/utils/dm";
import { useMessages } from '@/app/hooks/useMessages';

// Add color generation function
const getAvatarColor = (userId: string) => {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];
  
  const firstChar = userId.charAt(0).toLowerCase();
  const index = firstChar.charCodeAt(0) % colors.length;
  return colors[index];
};

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
  messageId?: string;
  attachments?: string[];
  edited?: boolean;
  deleted?: boolean;
  threadCount?: number;
}

interface WorkspaceClientProps {
  workspaceId: string;
}

interface ReadStatus {
  [userId: string]: {
    lastReadMessageId: string;
    lastReadTimestamp: string;
  };
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
  const { messages: channelMessages, isLoading: messagesLoading } = useMessages(selectedChannelId || '');
  const { isConnected, lastMessage, sendMessage, updatePresence, updateTyping } = useWebSocket(workspaceId);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [readStatus, setReadStatus] = useState<Record<string, ReadStatus>>({});

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
      if (isDMChannel(selectedChannelId)) {
        // For DM channels, create a virtual channel object
        setCurrentChannel({
          id: selectedChannelId,
          name: getDMDisplayName(selectedChannelId, session?.user?.email || '') || 'Unknown User',
          isPrivate: true,
          position: 0
        });
      } else {
        const response = await fetch(`/api/channels/${selectedChannelId}?workspaceId=${workspaceId}`);
        if (!response.ok) throw new Error('Failed to fetch channel');
        const data = await response.json();
        setCurrentChannel(data);
      }
    } catch (error) {
      console.error('Error fetching channel:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedChannelId, workspaceId, session?.user?.email]);

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
      if (activeThread && threadMessages.find(m => m.timestamp === messageId)) {
        // Edit thread message
        const response = await fetch(`/api/messages/${activeThread.messageId || activeThread.timestamp}/thread?messageId=${messageId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            channelId: selectedChannelId
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to edit thread message');
        }

        const updatedMessage = await response.json();
        setThreadMessages(prev => prev.map(m => 
          m.timestamp === messageId ? { ...m, content, edited: true } : m
        ));
      } else {
        // Edit channel message
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
      }

      setEditingMessage(null);
      setEditContent('');
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      if (activeThread && threadMessages.find(m => m.timestamp === messageId)) {
        // Delete thread message
        const response = await fetch(`/api/messages/${activeThread.messageId || activeThread.timestamp}/thread?messageId=${messageId}&channelId=${selectedChannelId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete thread message');
        }

        const deletedMessage = await response.json();
        setThreadMessages(prev => prev.map(m => 
          m.timestamp === messageId ? deletedMessage : m
        ));
      } else {
        // Delete channel message
        const response = await fetch(`/api/messages/${messageId}?channelId=${selectedChannelId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete message');
        }

        const deletedMessage = await response.json();
        setMessages(prev => prev.map(m => 
          m.timestamp === messageId ? deletedMessage : m
        ));
      }
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
              userId: lastMessage.userId || session?.user?.email || 'unknown',
              content: lastMessage.content!,
              attachments: lastMessage.attachments
            };

            // Check if message already exists using messageId
            const messageExists = prev.some(m => 
              (lastMessage.messageId && m.messageId === lastMessage.messageId) || // Check messageId first
              (m.content === newMessage.content && 
               m.userId === newMessage.userId &&
               // Messages within 1 second are considered duplicates
               Math.abs(new Date(m.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 1000)
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
        // Skip presence handling for now
        break;
      case 'typing':
        if (lastMessage.userId && lastMessage.channelId === selectedChannelId) {
          if (lastMessage.isTyping) {
            setTypingUsers(prev => ({
              ...prev,
              [lastMessage.userId!]: new Date().toISOString()
            }));
          } else {
            setTypingUsers(prev => {
              const updated = { ...prev };
              delete updated[lastMessage.userId!];
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
      // The server will handle storing in DynamoDB
      sendMessage(selectedChannelId, content, attachments);

      // Clear typing indicator
      handleTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [selectedChannelId, session?.user?.email, sendMessage, handleTyping]);

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
    if (!selectedChannelId || !channelMessages.length || !session?.user?.email) return;

    // Find the first unread message
    const userReadStatus = readStatus[selectedChannelId]?.[session.user.email];
    if (userReadStatus) {
      const lastReadTime = new Date(userReadStatus.lastReadTimestamp).getTime();
      const firstUnreadIndex = channelMessages.findIndex((msg: Message) => 
        new Date(msg.timestamp).getTime() > lastReadTime
      );

      if (firstUnreadIndex !== -1) {
        // Scroll to the first unread message with some context
        const scrollElement = scrollAreaRef.current;
        if (scrollElement) {
          const messageElements = scrollElement.getElementsByClassName('message-item');
          if (messageElements[Math.max(0, firstUnreadIndex - 1)]) {
            messageElements[Math.max(0, firstUnreadIndex - 1)].scrollIntoView({ behavior: 'smooth' });
            return;
          }
        }
      }
    }

    // If no unread messages or can't find the position, scroll to bottom
    scrollToBottom();
  }, [selectedChannelId, channelMessages, readStatus, session?.user?.email]);

  // Auto-scroll when new messages arrive if user was at bottom
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages, shouldAutoScroll, scrollToBottom]);

  // Handle thread view
  const handleViewThread = useCallback((message: Message) => {
    setActiveThread(message);
    
    // Fetch thread messages
    fetch(`/api/messages/${message.messageId || message.timestamp}/thread`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch thread messages');
        return response.json();
      })
      .then(data => {
        setThreadMessages(data.sort((a: Message, b: Message) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ));
      })
      .catch(error => {
        console.error('Error fetching thread messages:', error);
      });
  }, []);

  // Fetch read status when channel changes
  useEffect(() => {
    const fetchReadStatus = async () => {
      if (!selectedChannelId) return;

      try {
        const response = await fetch(`/api/messages/read?channelId=${selectedChannelId}`);
        if (!response.ok) throw new Error('Failed to fetch read status');
        
        const data = await response.json();
        setReadStatus(prev => ({
          ...prev,
          [selectedChannelId]: data.reduce((acc: any, status: any) => {
            acc[status.userId] = {
              lastReadMessageId: status.lastReadMessageId,
              lastReadTimestamp: status.lastReadTimestamp
            };
            return acc;
          }, {})
        }));
      } catch (error) {
        console.error('Error fetching read status:', error);
      }
    };

    fetchReadStatus();
  }, [selectedChannelId]);

  // Function to check if a message is unread
  const isMessageUnread = useCallback((message: Message, userId: string) => {
    if (!selectedChannelId || !readStatus[selectedChannelId]) return false;
    
    const userStatus = readStatus[selectedChannelId][userId];
    if (!userStatus) return true;

    const messageTime = new Date(message.timestamp).getTime();
    const lastReadTime = new Date(userStatus.lastReadTimestamp).getTime();
    
    return messageTime > lastReadTime;
  }, [readStatus, selectedChannelId]);

  // Update read status when messages are viewed
  useEffect(() => {
    if (!selectedChannelId || !channelMessages.length || !session?.user?.email) return;

    const lastMessage = channelMessages[channelMessages.length - 1];
    if (!lastMessage) return;

    // Only update if we're at the bottom of the chat
    if (shouldAutoScroll) {
      fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannelId,
          messageId: lastMessage.messageId || lastMessage.timestamp,
          workspaceId
        })
      })
      .catch(error => console.error('Error updating read status:', error));
    }
  }, [channelMessages, selectedChannelId, session?.user?.email, shouldAutoScroll, workspaceId]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="h-12 min-h-[3rem] border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isDMChannel(currentChannel?.id || '') ? (
              <User className="h-5 w-5 text-foreground" />
            ) : currentChannel?.isPrivate ? (
              <Lock className="h-5 w-5 text-foreground" />
            ) : (
              <Hash className="h-5 w-5 text-foreground" />
            )}
            <h1 className="font-semibold">{currentChannel?.name || 'Select a channel'}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && currentChannel && !isDMChannel(currentChannel.id) && (
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

      <div className="flex-1 flex">
        <div className={`flex-1 flex flex-col ${activeThread ? 'hidden md:flex' : ''}`}>
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
                  
                  // Add unread message divider
                  const showUnreadDivider = index > 0 && 
                    session?.user?.email &&
                    isMessageUnread(messages[index - 1], session.user.email) &&
                    !isMessageUnread(message, session.user.email);

                  return (
                    <div key={message.timestamp} className="flex flex-col group message-item">
                      {showUnreadDivider && (
                        <div className="border-t border-red-500 my-2 relative">
                          <span className="absolute -top-2.5 left-2 bg-background px-2 text-xs text-red-500">
                            New Messages
                          </span>
                        </div>
                      )}
                      {showHeader && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-2 mb-1">
                          <Avatar userId={message.userId}>
                            <AvatarFallback>{message.userId[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{message.userId}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          {editingMessage === message.timestamp ? (
                            <div className="flex items-end gap-2">
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="flex-1 min-h-[60px] bg-white text-black p-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-hover max-w-[85%]"
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
                                <span className={message.deleted ? "italic text-muted-foreground" : ""}>
                                  {message.content}
                                  {message.edited && !message.deleted && (
                                    <span className="text-[10px] text-muted-foreground ml-1">(edited)</span>
                                  )}
                                </span>
                                {message.attachments && message.attachments.length > 0 && !message.deleted && (
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
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[105%] opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/80 backdrop-blur-sm rounded-md p-0.5">
                                <button
                                  onClick={() => handleViewThread(message)}
                                  className="p-1 hover:bg-accent rounded"
                                  title="Reply in thread"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                </button>
                                {isOwnMessage && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingMessage(message.timestamp);
                                        setEditContent(message.content);
                                      }}
                                      className="p-1 hover:bg-accent rounded"
                                      title="Edit message"
                                    >
                                      <Settings className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(message.timestamp)}
                                      className="p-1 hover:bg-destructive/10 text-destructive rounded"
                                      title="Delete message"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {editingMessage !== message.timestamp && (
                          <span className="text-[10px] text-gray-400 pt-1">
                            {new Date(message.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        )}
                      </div>
                      {message.threadCount && message.threadCount > 0 && (
                        <button
                          onClick={() => handleViewThread(message)}
                          className="ml-8 mt-1 text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                        >
                          <MessageSquare className="h-3 w-3" />
                          {message.threadCount === 1 
                            ? "1 reply" 
                            : `${message.threadCount} replies`}
                        </button>
                      )}
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
        </div>

        {activeThread && (
          <div className="flex-1 flex flex-col border-l">
            <div className="h-12 min-h-[3rem] border-b flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <h2 className="font-semibold">Thread</h2>
              </div>
              <button
                onClick={() => setActiveThread(null)}
                className="hover:bg-accent p-2 rounded-md transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ScrollArea className="flex-1 relative">
              <div className="p-4 space-y-4">
                {/* Parent Message */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Avatar userId={activeThread.userId}>
                      <AvatarFallback>{activeThread.userId[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>{activeThread.userId}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      {editingMessage === activeThread.timestamp ? (
                        <div className="flex items-end gap-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="flex-1 min-h-[60px] bg-white text-black p-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-hover max-w-[85%]"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditMessage(activeThread.timestamp, editContent)}
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
                        <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5 text-sm text-foreground mt-1 inline-block relative group">
                          <div className="flex flex-col gap-1">
                            <span className={activeThread.deleted ? "italic text-muted-foreground" : ""}>
                              {activeThread.content}
                              {activeThread.edited && !activeThread.deleted && (
                                <span className="text-[10px] text-muted-foreground ml-1">(edited)</span>
                              )}
                            </span>
                          </div>
                          {activeThread.userId === session?.user?.email && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%+4px)] opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/80 backdrop-blur-sm rounded-md p-0.5">
                              <button
                                onClick={() => {
                                  setEditingMessage(activeThread.timestamp);
                                  setEditContent(activeThread.content);
                                }}
                                className="p-1 hover:bg-accent rounded"
                                title="Edit message"
                              >
                                <Settings className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(activeThread.timestamp)}
                                className="p-1 hover:bg-destructive/10 text-destructive rounded"
                                title="Delete message"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {editingMessage !== activeThread.timestamp && (
                      <span className="text-[10px] text-gray-400 pt-1">
                        {new Date(activeThread.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Thread Messages */}
                <div className="space-y-2">
                  {threadMessages.map((message, index) => {
                    const previousMessage = index === 0 ? activeThread : threadMessages[index - 1];
                    const showHeader = !previousMessage || previousMessage.userId !== message.userId;
                    const isOwnMessage = message.userId === session?.user?.email;

                    return (
                      <div key={message.timestamp} className="flex flex-col">
                        {showHeader && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Avatar userId={message.userId}>
                              <AvatarFallback>{message.userId[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span>{message.userId}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            {editingMessage === message.timestamp ? (
                              <div className="flex items-end gap-2">
                                <textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="flex-1 min-h-[60px] bg-white text-black p-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-hover max-w-[85%]"
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
                              <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5 text-sm text-foreground mt-1 inline-block relative group">
                                <div className="flex flex-col gap-1">
                                  <span className={message.deleted ? "italic text-muted-foreground" : ""}>
                                    {message.content}
                                    {message.edited && !message.deleted && (
                                      <span className="text-[10px] text-muted-foreground ml-1">(edited)</span>
                                    )}
                                  </span>
                                </div>
                                {isOwnMessage && (
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%+4px)] opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/80 backdrop-blur-sm rounded-md p-0.5">
                                    <button
                                      onClick={() => {
                                        setEditingMessage(message.timestamp);
                                        setEditContent(message.content);
                                      }}
                                      className="p-1 hover:bg-accent rounded"
                                      title="Edit message"
                                    >
                                      <Settings className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(message.timestamp)}
                                      className="p-1 hover:bg-destructive/10 text-destructive rounded"
                                      title="Delete message"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {editingMessage !== message.timestamp && (
                            <span className="text-[10px] text-gray-400 pt-1">
                              {new Date(message.timestamp).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>

            <div className="p-2 border-t">
              <MessageInput 
                channelId={selectedChannelId || ''}
                onMessageSent={async (content, attachments) => {
                  if (!activeThread.messageId && !activeThread.timestamp) return;
                  
                  try {
                    // Send message to thread only
                    const threadResponse = await fetch(`/api/messages/${activeThread.messageId || activeThread.timestamp}/thread`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        content,
                        userId: session?.user?.email,
                        attachments,
                        channelId: selectedChannelId
                      })
                    });

                    if (!threadResponse.ok) throw new Error('Failed to send thread message');

                    const newThreadMessage = await threadResponse.json();
                    setThreadMessages(prev => [...prev, newThreadMessage]);
                  } catch (error) {
                    console.error('Error sending thread message:', error);
                  }
                }}
                onTyping={handleTyping}
                isThreadReply={true}
              />
            </div>
          </div>
        )}
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