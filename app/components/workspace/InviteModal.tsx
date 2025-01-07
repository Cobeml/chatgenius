import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function InviteModal({ isOpen, onClose, workspaceId }: InviteModalProps) {
  const [emails, setEmails] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const emailList = emails.split(',').map(email => email.trim()).filter(Boolean);
      
      const response = await fetch('/api/user/workspace-invites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          emails: emailList,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invites');
      }

      onClose();
      setEmails('');
    } catch (err) {
      setError((err as Error).message || 'Failed to send invites. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Users</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Email Addresses
            </label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter email addresses separated by commas"
              rows={4}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn"
            >
              {isLoading ? 'Sending...' : 'Send Invites'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 