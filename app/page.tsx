'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import AuthModal from '@/app/components/auth/AuthModal';
import CreateWorkspaceModal from '@/app/components/workspace/CreateWorkspaceModal';
import Navbar from '@/app/components/navbar';

// Define a type for Workspace
interface Workspace {
  id: string;
  name: string;
  role: 'owner' | 'member';
}

interface WorkspaceInvite {
  id: string;
  workspaceName: string;
  inviterId: string;
}

interface UnifiedWorkspace extends Workspace {
  lastVisited?: string; // ISO date string
}

export default function Home() {
  const { data: session } = useSession();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [workspaces, setWorkspaces] = useState<UnifiedWorkspace[]>([]);
  const [workspaceInvites, setWorkspaceInvites] = useState<WorkspaceInvite[]>([]);

  useEffect(() => {
    if (session) {
      const fetchWorkspaces = async () => {
        try {
          const response = await fetch('/api/user/workspaces');
          if (!response.ok) throw new Error('Failed to fetch workspaces');
          const data = await response.json();
          
          // Combine and sort workspaces
          const allWorkspaces = [
            ...data.owned.map((w: Workspace) => ({
              ...w,
              lastVisited: localStorage.getItem(`workspace-${w.id}-lastVisit`) || '1970-01-01'
            })),
            ...data.administered.map((w: Workspace) => ({
              ...w,
              lastVisited: localStorage.getItem(`workspace-${w.id}-lastVisit`) || '1970-01-01'
            })),
            ...data.member.map((w: Workspace) => ({
              ...w,
              lastVisited: localStorage.getItem(`workspace-${w.id}-lastVisit`) || '1970-01-01'
            }))
          ].sort((a, b) => new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime());

          setWorkspaces(allWorkspaces);
          
          // Fetch invites
          const invitesResponse = await fetch('/api/user/workspace-invites');
          if (invitesResponse.ok) {
            const invitesData = await invitesResponse.json();
            setWorkspaceInvites(invitesData);
          }
        } catch (error) {
          console.error("Error fetching workspaces:", error);
        }
      };

      fetchWorkspaces();
    }
  }, [session]);

  const handleAcceptInvite = async (workspaceId: string) => {
    try {
      console.log('Accepting invite for workspace:', workspaceId);
      const response = await fetch('/api/workspaces/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to accept invite:', errorData);
        throw new Error(errorData.error || 'Failed to accept invite');
      }

      const result = await response.json();
      console.log('Successfully accepted invite:', result);

      // Refresh the page to update the workspace lists
      window.location.reload();
    } catch (error) {
      console.error('Error accepting invite:', error);
      // You might want to add proper error handling/notification here
    }
  };

  const handleDenyInvite = async (workspaceId: string) => {
    try {
      const response = await fetch('/api/workspaces/deny-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to deny invite:', errorData);
        throw new Error(errorData.error || 'Failed to deny invite');
      }

      // Refresh the page to update the workspace lists
      window.location.reload();
    } catch (error) {
      console.error('Error denying invite:', error);
    }
  };

  return (
    <>
      <Navbar />
      <div className="h-[calc(100vh-4rem)] overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
          {/* Hero Section */}
          <div className="text-center space-y-6 mb-12">
            <h1 className="text-7xl font-bold tracking-tight">
              Chat<span className="text-primary-hover">Genius</span>
            </h1>
            <p className="text-xl text-text/80 max-w-2xl mx-auto">
              Experience the next generation of team communication
            </p>
          </div>

          {/* Conditional Features Section and CTA Section */}
          {session ? (
            <div className="max-w-3xl mx-auto w-full space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Your Workspaces</h2>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCreateWorkspace(true)}
                >
                  Create Workspace
                </button>
              </div>
              
              <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-2">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    className="w-full group hover:bg-primary-hover/10 p-4 rounded-lg border border-primary-hover/20 
                             transition-all duration-200 flex justify-between items-center"
                    onClick={() => {
                      localStorage.setItem(`workspace-${workspace.id}-lastVisit`, new Date().toISOString());
                      window.location.href = `/workspace/${workspace.id}`;
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-md bg-primary-hover/20 flex items-center justify-center">
                        <span className="text-lg font-medium">{workspace.name[0].toUpperCase()}</span>
                      </div>
                      <span className="text-lg">{workspace.name}</span>
                    </div>
                    <span className="text-sm text-text/60 group-hover:text-text/80 transition-colors">
                      {workspace.role}
                    </span>
                  </button>
                ))}
                
                {workspaceInvites.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-text/60 mb-2">Pending Invites</h3>
                    {workspaceInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="w-full group hover:bg-primary-hover/10 p-4 rounded-lg border border-primary-hover/20 
                                 transition-all duration-200 flex justify-between items-center"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-md bg-primary-hover/20 flex items-center justify-center">
                            <span className="text-lg font-medium">{invite.workspaceName[0].toUpperCase()}</span>
                          </div>
                          <span className="text-lg">{invite.workspaceName}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptInvite(invite.id)}
                            className="px-3 py-1 text-sm text-primary-hover hover:bg-primary-hover/10 rounded-md transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDenyInvite(invite.id)}
                            className="px-3 py-1 text-sm text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Features Section - Only shown when logged out */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                <div className="p-6 rounded-lg border border-primary-hover bg-black/20 backdrop-blur">
                  <h3 className="text-lg font-semibold mb-2 text-primary-hover">Real-time Collaboration</h3>
                  <p className="text-text/70">
                    Instant messaging with typing indicators and read receipts. Stay connected with your team in real-time.
                  </p>
                </div>
                <div className="p-6 rounded-lg border border-primary-hover bg-black/20 backdrop-blur">
                  <h3 className="text-lg font-semibold mb-2 text-primary-hover">Smart Organization</h3>
                  <p className="text-text/70">
                    Organize conversations in channels and threads. Keep discussions focused and productive.
                  </p>
                </div>
                <div className="p-6 rounded-lg border border-primary-hover bg-black/20 backdrop-blur">
                  <h3 className="text-lg font-semibold mb-2 text-primary-hover">Secure & Reliable</h3>
                  <p className="text-text/70">
                    Enterprise-grade security with end-to-end encryption. Your data stays private and protected.
                  </p>
                </div>
              </div>

              {/* Logged out CTA */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-4 justify-center">
                  <button className="btn" onClick={() => setShowSignIn(true)}>
                    Sign in
                  </button>
                  <button className="btn" onClick={() => setShowSignUp(true)}>
                    Sign up
                  </button>
                </div>
                <p className="text-sm text-text/60">
                  Join thousands of teams already using ChatGenius
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <AuthModal 
        isOpen={showSignIn}
        onClose={() => setShowSignIn(false)}
        mode="signin"
      />
      <AuthModal 
        isOpen={showSignUp}
        onClose={() => setShowSignUp(false)}
        mode="signup"
      />
      <CreateWorkspaceModal
        isOpen={showCreateWorkspace}
        onClose={() => setShowCreateWorkspace(false)}
      />
    </>
  );
}
