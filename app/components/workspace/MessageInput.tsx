'use client';

import { useState } from 'react';
import { Textarea } from "@/app/components/ui/text-area";
import { ArrowUpIcon } from "@radix-ui/react-icons";
import { Paperclip, X } from 'lucide-react';

interface MessageInputProps {
  channelId: string;
  onMessageSent: () => void;
}

interface PendingAttachment {
  name: string;
  url: string;
}

export function MessageInput({ channelId, onMessageSent }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('channelId', channelId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();
      setPendingAttachments(prev => [...prev, { name: file.name, url: data.fileUrl }]);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!message.trim() && pendingAttachments.length === 0) || !channelId) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId,
          content: message.trim(),
          attachments: pendingAttachments.map(att => att.url)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setMessage('');
      setPendingAttachments([]);
      onMessageSent();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-gray-800 rounded">
          {pendingAttachments.map((file, index) => (
            <div 
              key={index}
              className="flex items-center gap-2 bg-gray-700 px-2 py-1 rounded"
            >
              <span className="text-sm">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={channelId ? "Type a message..." : "Select a channel to start messaging"}
          className="min-h-[80px] flex-1 bg-black text-white"
          disabled={!channelId}
        />
        <div className="flex flex-col gap-2 justify-start">
          <button
            type="submit"
            disabled={!channelId || (!message.trim() && pendingAttachments.length === 0)}
            className="btn rounded-full w-10 h-10 flex items-center justify-center p-0"
            aria-label="Send message"
            onClick={handleSubmit}
          >
            <ArrowUpIcon className="h-5 w-5" />
          </button>
          <label className="w-10 h-10 flex items-center justify-center cursor-pointer hover:text-primary-hover transition-colors">
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={!channelId}
            />
            <Paperclip className="h-5 w-5" />
          </label>
        </div>
      </div>
    </div>
  );
} 