'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from "@/app/components/ui/button";
import { Paperclip, ArrowUp, X } from 'lucide-react';

interface MessageInputProps {
  channelId: string;
  onMessageSent: (content: string, attachments?: string[]) => void | Promise<void>;
  onTyping?: (isTyping: boolean) => void;
}

export function MessageInput({ channelId, onMessageSent, onTyping }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ name: string; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (onTyping) {
      onTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to clear typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  }, [onTyping]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !pendingAttachment) || isUploading) return;

    try {
      await onMessageSent(
        content.trim(),
        pendingAttachment ? [pendingAttachment.url] : undefined
      );
      setContent('');
      setPendingAttachment(null);
      if (onTyping) {
        onTyping(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !channelId) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('channelId', channelId);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { fileUrl } = await response.json();
      setPendingAttachment({ name: file.name, url: fileUrl });
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Add key press handler
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="space-y-2">
      {pendingAttachment && (
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5">
          <span className="text-sm text-pink-500">{pendingAttachment.name}</span>
          <button
            onClick={() => setPendingAttachment(null)}
            className="text-pink-500 hover:text-pink-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyPress}
            placeholder={pendingAttachment ? "Add a message..." : "Type a message..."}
            className="w-full min-h-[60px] bg-white text-black p-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-hover"
          />
        </div>
        <div className="flex flex-col justify-between h-[60px]">
          <Button 
            type="submit" 
            variant="ghost"
            size="icon"
            className="text-pink-500 hover:text-pink-700 h-7 w-7 p-0"
            disabled={(!content.trim() && !pendingAttachment) || isUploading}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !!pendingAttachment}
            className="hover:text-pink-700 h-7 w-7 p-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
} 