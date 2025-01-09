'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";

interface WorkspaceMember {
  email: string;
  role: 'owner' | 'admin' | 'member';
}

interface WorkspaceSettings {
  name: string;
  members: WorkspaceMember[];
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  initialSettings?: WorkspaceSettings;
}

export function SettingsModal({ isOpen, onClose, workspaceId, initialSettings }: SettingsModalProps) {
  const [settings, setSettings] = useState<WorkspaceSettings>(initialSettings || {
    name: '',
    members: []
  });

  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/members`);
        if (!response.ok) throw new Error('Failed to fetch members');
        const data = await response.json();
        setMembers(data);
      } catch (error) {
        console.error('Error fetching members:', error);
      }
    };

    if (isOpen) {
      fetchMembers();
    }
  }, [workspaceId, isOpen]);

  useEffect(() => {
    const fetchWorkspaceDetails = async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}`);
        if (!response.ok) throw new Error('Failed to fetch workspace details');
        const data = await response.json();
        setSettings(prevSettings => ({
          ...prevSettings,
          name: data.name
        }));
      } catch (error) {
        console.error('Error fetching workspace details:', error);
      }
    };

    if (isOpen) {
      fetchWorkspaceDetails();
    }
  }, [workspaceId, isOpen]);

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to update workspace');
      onClose();
    } catch (error) {
      console.error('Error updating workspace:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Workspace Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Workspace Name</label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              className="input w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Members</label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {members.map((member) => (
                <div
                  key={member.email}
                  className="group hover:bg-primary-hover/10 p-3 rounded-lg border border-primary-hover/20 
                           transition-all duration-200 flex justify-between items-center"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-md bg-primary-hover/20 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {member.email[0].toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm">{member.email}</span>
                  </div>
                  <span className="text-sm text-text/60 group-hover:text-text/80 transition-colors">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn">
            Cancel
          </button>
          <button onClick={handleSave} className="btn">
            Save Changes
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 