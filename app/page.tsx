'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import AuthModal from '@/app/components/auth/AuthModal';
import CreateWorkspaceModal from '@/app/components/workspace/CreateWorkspaceModal';

export default function Home() {
  const { data: session } = useSession();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);

  return (
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
            <div className="flex flex-col items-center gap-4">
              <button 
                className="btn"
                onClick={() => setShowCreateWorkspace(true)}
              >
                Create Workspace
              </button>
              <p className="text-sm text-text/60">
                or join an existing workspace via invite
              </p>
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
    </div>
  );
}
