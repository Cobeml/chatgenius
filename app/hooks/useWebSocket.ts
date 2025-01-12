import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface WebSocketMessage {
  type: 'message' | 'presence' | 'typing';
  channelId?: string;
  content?: string;
  userId?: string;
  messageId?: string;
  status?: string;
  isTyping?: boolean;
  timestamp?: string;
  attachments?: string[];
}

export function useWebSocket(workspaceId: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    // Don't attempt connection if session is still loading
    if (status === 'loading') {
      console.log('Session still loading, waiting...');
      return;
    }

    // Don't attempt connection if no session or workspaceId
    if (!session?.user?.email || !workspaceId) {
      console.log('Missing required connection parameters:', { 
        email: session?.user?.email,
        workspaceId,
        sessionStatus: status 
      });
      return;
    }

    const wsUrl = new URL(process.env.NEXT_PUBLIC_WEBSOCKET_URL!);
    wsUrl.searchParams.append('token', session.user.email);
    wsUrl.searchParams.append('workspaceId', workspaceId);

    console.log('Attempting WebSocket connection:', {
      url: wsUrl.toString(),
      workspaceId,
      userEmail: session.user.email,
      sessionStatus: status
    });
    
    function setupWebSocket() {
      const ws = new WebSocket(wsUrl.toString());

      ws.onopen = () => {
        console.log('WebSocket connection established:', {
          url: wsUrl.toString(),
          readyState: ws.readyState,
          protocol: ws.protocol,
          sessionStatus: status
        });
        setIsConnected(true);
        setSocket(ws);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          url: wsUrl.toString(),
          sessionStatus: status
        });
        setIsConnected(false);
        setSocket(null);
        
        // Only attempt to reconnect if we still have a valid session
        if (session?.user?.email) {
          console.log('Attempting to reconnect WebSocket in 3 seconds...');
          setTimeout(setupWebSocket, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', {
          error,
          url: wsUrl.toString(),
          readyState: ws.readyState,
          sessionStatus: status
        });
      };

      ws.onmessage = (event) => {
        try {
          console.log('WebSocket received raw message:', {
            data: event.data,
            type: event.type,
            origin: event.origin,
            sessionStatus: status
          });
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log('Parsed WebSocket message:', message);
          setLastMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', {
            error: error instanceof Error ? error.message : error,
            data: event.data,
            sessionStatus: status
          });
        }
      };

      return ws;
    }

    const ws = setupWebSocket();

    // Cleanup on unmount or when session/workspaceId changes
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log('Closing WebSocket connection on cleanup');
        ws.close();
      }
    };
  }, [workspaceId, session?.user?.email, status]);

  // Send a message
  const sendMessage = useCallback((channelId: string, content: string, attachments?: string[]) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket not connected');
      return;
    }

    const message = {
      action: 'message',
      channelId,
      content,
      workspaceId,
      attachments
    };
    
    console.log('Sending WebSocket message:', message);
    socket.send(JSON.stringify(message));
  }, [socket, workspaceId]);

  // Update presence
  const updatePresence = useCallback((status: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({
      action: 'presence',
      workspaceId,
      status
    }));
  }, [socket, workspaceId]);

  // Update typing status
  const updateTyping = useCallback((channelId: string, isTyping: boolean) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({
      action: 'typing',
      channelId,
      workspaceId,
      isTyping
    }));
  }, [socket, workspaceId]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    updatePresence,
    updateTyping
  };
} 