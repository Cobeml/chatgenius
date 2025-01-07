'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";

interface WorkspaceSettings {
  name: string;
  members: string[];
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
            <div className="border rounded-md p-2">
              {settings.members.map((member, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <span>{member}</span>
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      members: settings.members.filter((_, i) => i !== index)
                    })}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
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