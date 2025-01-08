'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Hash, Plus, Settings } from "lucide-react";
import { SettingsModal } from "@/app/components/workspace/SettingsModal";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from 'next/navigation';
import type { CSSProperties } from 'react';

interface Channel {
  id: string;
  name: string;
  isPrivate: boolean;
  position: number;
}

interface WorkspaceData {
  name: string;
  members: string[];
  ownerId: string;
}

const getItemStyle = (isDragging: boolean, draggableStyle: CSSProperties | undefined): CSSProperties => ({
  userSelect: 'none' as const,
  padding: "0.375rem 0.5rem",
  marginBottom: "0.25rem",
  background: isDragging ? "hsl(var(--accent))" : "transparent",
  borderRadius: "0.375rem",
  ...(draggableStyle || {})
});

const getListStyle = (isDraggingOver: boolean) => ({
  background: isDraggingOver ? "hsl(var(--accent)/0.1)" : "transparent",
  padding: "0.5rem",
  borderRadius: "0.375rem"
});

export function Sidebar({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedChannelId = searchParams.get('channel');
  const { data: session } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNewChannelModalOpen, setIsNewChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  const fetchWorkspaceData = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`);
      const data = await res.json();
      setWorkspace(data);
    } catch (error) {
      console.error('Failed to fetch workspace:', error);
    }
  }, [workspaceId]);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch(`/api/channels?workspaceId=${workspaceId}`);
      const data = await res.json();
      setChannels(data.sort((a: Channel, b: Channel) => a.position - b.position));
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchWorkspaceData();
    fetchChannels();
  }, [workspaceId, fetchWorkspaceData, fetchChannels]);

  const handleCreateChannel = async () => {
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          name: newChannelName
        })
      });

      if (!res.ok) throw new Error('Failed to create channel');
      
      await fetchChannels();
      setIsNewChannelModalOpen(false);
      setNewChannelName('');
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(channels);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Optimistically update the UI
    const updatedChannels = items.map((item, index) => ({
      ...item,
      position: index
    }));
    setChannels(updatedChannels);

    // Update positions in database
    try {
      const res = await fetch('/api/channels/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          channels: updatedChannels.map(c => ({
            id: c.id,
            position: c.position
          }))
        })
      });

      if (!res.ok) {
        // If the update fails, refresh the channels to get the correct order
        await fetchChannels();
        throw new Error('Failed to update channel positions');
      }
    } catch (error) {
      console.error('Failed to update channel positions:', error);
    }
  };

  const handleChannelSelect = (channelId: string) => {
    router.push(`/workspace/${workspaceId}?channel=${channelId}`);
  };

  return (
    <div className="w-64 border-r bg-muted/50 flex flex-col">
      {/* Workspace Header */}
      <div className="h-14 border-b flex items-center justify-between px-4">
        <h2 className="font-semibold truncate">{workspace?.name || 'Loading...'}</h2>
        <button 
          onClick={() => setIsSettingsModalOpen(true)}
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Channels */}
      <ScrollArea className="flex-1 px-2">
        <div className="py-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Channels</h3>
            {workspace?.ownerId === session?.user?.email && (
              <button 
                onClick={() => setIsNewChannelModalOpen(true)}
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="channels">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  style={getListStyle(snapshot.isDraggingOver)}
                >
                  {channels.map((channel, index) => (
                    <Draggable 
                      key={channel.id} 
                      draggableId={channel.id} 
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={getItemStyle(
                            snapshot.isDragging,
                            provided.draggableProps.style
                          )}
                          onClick={() => handleChannelSelect(channel.id)}
                          className={`cursor-pointer hover:bg-accent/50 ${
                            selectedChannelId === channel.id ? 'bg-accent' : ''
                          }`}
                        >
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Hash className="h-4 w-4 mr-2 inline-block" />
                            <span className="truncate">{channel.name}</span>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </ScrollArea>

      {/* New Channel Modal */}
      <Dialog open={isNewChannelModalOpen} onOpenChange={setIsNewChannelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Channel Name</label>
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="input w-full"
                placeholder="e.g. general"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => setIsNewChannelModalOpen(false)}>
                Cancel
              </button>
              <button className="btn" onClick={handleCreateChannel}>
                Create Channel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        workspaceId={workspaceId}
        initialSettings={workspace || undefined}
      />
    </div>
  );
} 