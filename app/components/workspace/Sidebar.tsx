'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Hash, Plus, Settings, Lock, MoreVertical, MessageCircle } from "lucide-react";
import { SettingsModal } from "@/app/components/workspace/SettingsModal";
import { ChannelSettingsModal } from "@/app/components/workspace/ChannelSettingsModal";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from 'next/navigation';
import { InviteModal } from "@/app/components/workspace/InviteModal";
import type { CSSProperties } from 'react';
import { isDMChannel, getDMDisplayName, getDMChannelId } from "@/app/utils/dm";
import { DMUserSelect } from "@/app/components/workspace/DMUserSelect";

interface Channel {
  id: string;
  name: string;
  isPrivate: boolean;
  position: number;
}

interface DMChannel {
  id: string;
  lastMessage?: {
    content: string;
    timestamp: string;
  };
  unreadCount?: number;
}

interface WorkspaceData {
  name: string;
  members: string[];
  ownerId: string;
  userRole?: 'owner' | 'admin' | 'member';
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
  const [isChannelSettingsModalOpen, setIsChannelSettingsModalOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isPrivateChannel, setIsPrivateChannel] = useState(false);
  const [dmChannels, setDMChannels] = useState<DMChannel[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<{ email: string }[]>([]);

  const isAdmin = workspace?.userRole === 'owner' || workspace?.userRole === 'admin';

  const fetchWorkspaceData = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`);
      const data = await res.json();
      setWorkspace({
        ...data,
        userRole: data.userRole || (data.ownerId === session?.user?.email ? 'owner' : 'member')
      });
    } catch (error) {
      console.error('Failed to fetch workspace:', error);
    }
  }, [workspaceId, session?.user?.email]);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch(`/api/channels?workspaceId=${workspaceId}`);
      const data = await res.json();
      setChannels(data.sort((a: Channel, b: Channel) => a.position - b.position));
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    }
  }, [workspaceId]);

  const fetchDMChannels = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?userId=${session?.user?.email}`);
      if (!res.ok) throw new Error('Failed to fetch DM channels');
      const messages = await res.json();
      
      // Group messages by channel and get latest message
      const dmChannelsMap = new Map<string, DMChannel>();
      messages.forEach((message: any) => {
        if (isDMChannel(message.channelId)) {
          const existing = dmChannelsMap.get(message.channelId);
          if (!existing || new Date(message.timestamp) > new Date(existing.lastMessage?.timestamp || '')) {
            dmChannelsMap.set(message.channelId, {
              id: message.channelId,
              lastMessage: {
                content: message.content,
                timestamp: message.timestamp
              }
            });
          }
        }
      });
      
      setDMChannels(Array.from(dmChannelsMap.values()));
    } catch (error) {
      console.error('Failed to fetch DM channels:', error);
    }
  }, [session?.user?.email]);

  const fetchWorkspaceMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (!res.ok) throw new Error('Failed to fetch members');
      const data = await res.json();
      setWorkspaceMembers(data.filter((member: { email: string }) => 
        member.email !== session?.user?.email
      ));
    } catch (error) {
      console.error('Failed to fetch workspace members:', error);
    }
  }, [workspaceId, session?.user?.email]);

  useEffect(() => {
    fetchWorkspaceData();
    fetchChannels();
  }, [workspaceId, fetchWorkspaceData, fetchChannels]);

  useEffect(() => {
    if (session?.user?.email) {
      fetchDMChannels();
    }
  }, [session?.user?.email, fetchDMChannels]);

  useEffect(() => {
    if (session?.user?.email) {
      fetchWorkspaceMembers();
    }
  }, [session?.user?.email, fetchWorkspaceMembers]);

  const handleCreateChannel = async () => {
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          name: newChannelName,
          isPrivate: isPrivateChannel
        })
      });

      if (!res.ok) throw new Error('Failed to create channel');
      
      await fetchChannels();
      setIsNewChannelModalOpen(false);
      setNewChannelName('');
      setIsPrivateChannel(false);
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
        {isAdmin && (
          <button onClick={() => setIsSettingsModalOpen(true)}>
            <Settings className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1 px-2">
        {/* Channels */}
        <div className="py-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Channels</h3>
            {isAdmin && (
              <button onClick={() => setIsNewChannelModalOpen(true)}>
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
                          className={`cursor-pointer hover:bg-accent/50 group ${
                            selectedChannelId === channel.id ? 'bg-accent text-accent-foreground' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center">
                              {channel.isPrivate ? (
                                <Lock className="h-4 w-4 mr-2 inline-block" />
                              ) : (
                                <Hash className="h-4 w-4 mr-2 inline-block" />
                              )}
                              <span className={`truncate ${selectedChannelId === channel.id ? 'text-accent-foreground font-medium' : ''}`}>
                                {channel.name}
                              </span>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedChannel(channel);
                                  setIsChannelSettingsModalOpen(true);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-foreground hover:text-accent-foreground"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            )}
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

        {/* Direct Messages */}
        <div className="py-2">
          <div className="px-2 mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Direct Messages</h3>
          </div>
          <div className="space-y-[2px]">
            {workspaceMembers.map((member) => {
              const channelId = getDMChannelId(session?.user?.email || '', member.email);
              const dmChannel = dmChannels.find(ch => ch.id === channelId);
              
              return (
                <div
                  key={member.email}
                  onClick={() => handleChannelSelect(channelId)}
                  className={`cursor-pointer hover:bg-accent/50 group px-2 py-1.5 rounded ${
                    selectedChannelId === channelId ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <MessageCircle className="h-4 w-4 mr-2 inline-block" />
                      <span className={`truncate ${selectedChannelId === channelId ? 'text-accent-foreground font-medium' : ''}`}>
                        {member.email}
                      </span>
                    </div>
                    {dmChannel?.unreadCount && dmChannel.unreadCount > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                        {dmChannel.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="private-channel"
                checked={isPrivateChannel}
                onChange={(e) => setIsPrivateChannel(e.target.checked)}
                className="checkbox"
              />
              <label htmlFor="private-channel" className="text-sm font-medium">
                Make channel private
              </label>
            </div>
            {isPrivateChannel && (
              <p className="text-sm text-muted-foreground">
                Private channels are only visible to invited members
              </p>
            )}
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
        initialSettings={workspace ? {
          name: workspace.name,
          members: [] // We'll fetch members separately in the modal
        } : undefined}
      />

      {isAdmin && (
        <div className="p-2 border-t">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="w-full btn text-sm py-1.5"
          >
            Invite Users
          </button>
        </div>
      )}

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        workspaceId={workspaceId}
      />

      {/* Channel Settings Modal */}
      {selectedChannel && (
        <ChannelSettingsModal
          isOpen={isChannelSettingsModalOpen}
          onClose={() => {
            setIsChannelSettingsModalOpen(false);
            setSelectedChannel(null);
          }}
          workspaceId={workspaceId}
          channelId={selectedChannel.id}
          channelName={selectedChannel.name}
          isPrivate={selectedChannel.isPrivate}
        />
      )}
    </div>
  );
} 