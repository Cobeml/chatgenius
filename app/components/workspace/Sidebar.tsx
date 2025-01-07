'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Button } from "@/app/components/ui/button";
import { 
  Hash, 
  Plus,
  Settings
} from "lucide-react";

interface Channel {
  id: string;
  name: string;
  isPrivate: boolean;
}

export function Sidebar({ workspaceId }: { workspaceId: string }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [workspace, setWorkspace] = useState<{ name: string } | null>(null);

  useEffect(() => {
    // Fetch workspace details and channels
    const fetchWorkspaceData = async () => {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}`);
        const data = await res.json();
        setWorkspace(data);
      } catch (error) {
        console.error('Failed to fetch workspace:', error);
      }
    };

    fetchWorkspaceData();
  }, [workspaceId]);

  return (
    <div className="w-64 border-r bg-muted/50 flex flex-col">
      {/* Workspace Header */}
      <div className="h-14 border-b flex items-center justify-between px-4">
        <h2 className="font-semibold truncate">{workspace?.name || 'Loading...'}</h2>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Channels */}
      <ScrollArea className="flex-1 px-2">
        <div className="py-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Channels</h3>
            <Button variant="ghost" size="icon" className="h-4 w-4">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-[2px]">
            {channels.map((channel) => (
              <Button
                key={channel.id}
                variant="ghost"
                className="w-full justify-start px-2"
              >
                <Hash className="h-4 w-4 mr-2" />
                {channel.name}
              </Button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
} 