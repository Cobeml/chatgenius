'use client';

import { useState } from 'react';
import { Textarea } from "@/app/components/ui/text-area";

export function MessageInput({ channelId }: { channelId: string }) {
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement message sending
  };

  return (
    <form onSubmit={handleSubmit}>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        className="min-h-[80px]"
      />
    </form>
  );
} 