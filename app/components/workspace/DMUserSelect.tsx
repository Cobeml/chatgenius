'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Search } from "lucide-react";
import { getDMChannelId } from '@/app/utils/dm';
import { useRouter } from 'next/navigation';

interface DMUserSelectProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  workspaceId: string;
}

export function DMUserSelect({ isOpen, onClose, currentUserId, workspaceId }: DMUserSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<{ email: string }[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<{ email: string }[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/members`);
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        setUsers(data.filter((user: { email: string }) => user.email !== currentUserId));
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, workspaceId, currentUserId]);

  useEffect(() => {
    const filtered = users.filter(user => 
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const handleUserSelect = (userId: string) => {
    const channelId = getDMChannelId(currentUserId, userId);
    router.push(`/workspace/${workspaceId}?channel=${channelId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a Conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-9 pr-4 py-2 bg-muted rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <button
                  key={user.email}
                  onClick={() => handleUserSelect(user.email)}
                  className="w-full flex items-center gap-3 p-2 hover:bg-accent rounded-md transition-colors"
                >
                  <Avatar>
                    <AvatarFallback>{user.email[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users found
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
} 