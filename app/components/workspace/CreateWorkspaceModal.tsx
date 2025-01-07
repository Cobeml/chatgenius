'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const data = await res.json();
        onClose();
        router.push(`/workspace/${data.id}`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create workspace');
      }
    } catch (err) {
      setError('Failed to create workspace');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background p-8 rounded-lg w-full max-w-md border border-primary-hover relative">
        <h2 className="text-2xl mb-6 font-bold">Create Workspace</h2>
        {error && (
          <div className="mb-4 p-2 text-sm text-red-500 bg-red-500/10 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Workspace Name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button 
            type="submit" 
            className="btn"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Workspace'}
          </button>
        </form>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-text hover:text-text-hover"
        >
          ✕
        </button>
      </div>
    </div>
  );
} 