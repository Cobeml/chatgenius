import { useState, useEffect } from 'react';

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

export function useMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!channelId) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/messages/${channelId}`);
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
    };

    fetchMessages();
  }, [channelId]);

  return { messages, isLoading };
} 