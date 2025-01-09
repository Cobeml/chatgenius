import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { useSession } from "next-auth/react";

interface ChannelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  channelId: string;
  channelName: string;
  isPrivate: boolean;
}

export function ChannelSettingsModal({ 
  isOpen, 
  onClose, 
  workspaceId, 
  channelId,
  channelName,
  isPrivate 
}: ChannelSettingsModalProps) {
  const { data: session } = useSession();
  const [members, setMembers] = useState<string[]>([]);
  const [newMember, setNewMember] = useState('');
  const [workspaceMembers, setWorkspaceMembers] = useState<{ email: string; role: string }[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWorkspaceMembers = async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/members`);
        if (!response.ok) throw new Error('Failed to fetch workspace members');
        const data = await response.json();
        setWorkspaceMembers(data);
      } catch (error) {
        console.error('Error fetching workspace members:', error);
      }
    };

    const fetchChannelMembers = async () => {
      if (!isPrivate) return;
      try {
        const response = await fetch(`/api/channels/${channelId}/members?workspaceId=${workspaceId}`);
        if (!response.ok) throw new Error('Failed to fetch channel members');
        const data = await response.json();
        setMembers(data);
      } catch (error) {
        console.error('Error fetching channel members:', error);
      }
    };

    if (isOpen) {
      fetchWorkspaceMembers();
      fetchChannelMembers();
    }
  }, [isOpen, workspaceId, channelId, isPrivate]);

  const handleAddMember = async () => {
    if (!newMember) return;

    try {
      const response = await fetch(`/api/channels/${channelId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          members: [newMember]
        })
      });

      if (!response.ok) throw new Error('Failed to add member');

      const data = await response.json();
      setMembers(data.members);
      setNewMember('');
      setError('');
    } catch (error) {
      console.error('Error adding member:', error);
      setError('Failed to add member');
    }
  };

  const handleRemoveMember = async (memberEmail: string) => {
    try {
      const response = await fetch(
        `/api/channels/${channelId}/members?workspaceId=${workspaceId}&member=${encodeURIComponent(memberEmail)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to remove member');

      const data = await response.json();
      setMembers(data.members);
      setError('');
    } catch (error) {
      console.error('Error removing member:', error);
      setError('Failed to remove member');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Channel Settings - {channelName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isPrivate ? (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Channel Members</h3>
                <div className="flex gap-2">
                  <select
                    value={newMember}
                    onChange={(e) => setNewMember(e.target.value)}
                    className="flex-1 h-10 px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background 
                             focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Select a member to add</option>
                    {workspaceMembers
                      .filter(m => !members.includes(m.email))
                      .map(member => (
                        <option key={member.email} value={member.email}>
                          {member.email} ({member.role})
                        </option>
                      ))}
                  </select>
                  <button 
                    className="px-4 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 
                             transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    onClick={handleAddMember}
                    disabled={!newMember}
                  >
                    Add
                  </button>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Current Members</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {members.map(member => (
                      <div
                        key={member}
                        className="group hover:bg-primary-hover/10 p-3 rounded-lg border border-primary-hover/20 
                                 transition-all duration-200 flex justify-between items-center"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-md bg-primary-hover/20 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {member[0].toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm">{member}</span>
                        </div>
                        {member !== session?.user?.email && (
                          <button
                            onClick={() => handleRemoveMember(member)}
                            className="text-destructive hover:text-destructive/80 text-sm transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              This is a public channel. All workspace members can access it.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 