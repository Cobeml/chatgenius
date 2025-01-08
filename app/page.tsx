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

interface WorkspaceMember {
  userId: string;
  role: 'owner' | 'member';
}

interface WorkspaceData {
  id: string;
  name: string;
  members: WorkspaceMember[];
}

export default function Home() {
  const { data: session } = useSession();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [ownedWorkspaces, setOwnedWorkspaces] = useState<Workspace[]>([]);
  const [memberWorkspaces, setMemberWorkspaces] = useState<Workspace[]>([]);
  const [workspaceInvites, setWorkspaceInvites] = useState<WorkspaceInvite[]>([]);

  useEffect(() => {
    if (session) {
      const fetchWorkspaces = async () => {
        try {
          const response = await fetch('/api/user/workspaces');
          if (!response.ok) throw new Error('Failed to fetch workspaces');
          const data: WorkspaceData[] = await response.json();
          
          console.log('All workspaces data:', data);
          
          const owned = data.filter((w) => 
            w.members?.some?.((m) => 
              m.userId === session.user?.email && m.role === 'owner'
            ) || false
          );
          setOwnedWorkspaces(owned.map((w) => ({
            id: w.id,
            name: w.name,
            role: 'owner' as const
          })));

          const member = data.filter((w) => 
            w.members?.some?.((m) => 
              m.userId === session.user?.email && m.role === 'member'
            ) || false
          );
          setMemberWorkspaces(member.map((w) => ({
            id: w.id,
            name: w.name,
            role: 'member' as const
          })));
          
          // Fetch invites
          const invitesResponse = await fetch('/api/user/workspace-invites');
          if (invitesResponse.ok) {
            const invitesData = await invitesResponse.json();
            console.log('Workspace invites:', invitesData);
            setWorkspaceInvites(invitesData);
          }
        } catch (error) {
          console.error("Error fetching workspaces:", error);
        }
      };

      fetchWorkspaces();
    }
  }, [session]);

  const WorkspaceSection = ({ title, workspaces, type }: { title: string, workspaces: Workspace[] | WorkspaceInvite[], type: 'workspace' | 'invite' }) => {
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

    return workspaces.length > 0 && (
      <div className="w-full">
        <h3 className="text-sm font-medium text-text/60 mb-2">{title}</h3>
        <div className="flex flex-col gap-2">
          {workspaces.map((item) => (
            <button
              key={item.id}
              className="btn text-left"
              onClick={() => {
                if (type === 'workspace') {
                  window.location.href = `/workspace/${item.id}`;
                } else {
                  handleAcceptInvite(item.id);
                }
              }}
            >
              {type === 'workspace' 
                ? (item as Workspace).name
                : `${(item as WorkspaceInvite).workspaceName} (Invite)`
              }
            </button>
          ))}
        </div>
      </div>
    );
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

          {/* Features Section */}
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

          {/* CTA Section */}
          <div className="text-center space-y-4">
            {session ? (
              // Logged in state
              <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
                <button 
                  className="btn w-full"
                  onClick={() => setShowCreateWorkspace(true)}
                >
                  Create Workspace
                </button>
                <div className="w-full space-y-4">
                  <WorkspaceSection title="Your Workspaces" workspaces={ownedWorkspaces} type="workspace" />
                  <WorkspaceSection title="Member Workspaces" workspaces={memberWorkspaces} type="workspace" />
                  <WorkspaceSection title="Pending Invites" workspaces={workspaceInvites} type="invite" />
                </div>
              </div>
            ) : (
              // Logged out state
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
            )}
          </div>
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
