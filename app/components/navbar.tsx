'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import AuthModal from './auth/AuthModal';

const Navbar = () => {
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const { data: session } = useSession();

  return (
    <>
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="text-xl font-bold">ChatGenius</div>
            <div className="flex gap-4">
              {session?.user ? (
                <div className="relative group">
                  <span className="text-text hover:text-text-hover cursor-pointer">
                    {session.user.email}
                  </span>
                  <button 
                    onClick={() => signOut()}
                    className="btn absolute right-0 top-full mt-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <>
                  <button className="btn" onClick={() => setShowSignIn(true)}>
                    Sign in
                  </button>
                  <button className="btn" onClick={() => setShowSignUp(true)}>
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

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
    </>
  );
};

export default Navbar; 