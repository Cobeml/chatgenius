'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
}

export default function AuthModal({ isOpen, onClose, mode }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup') {
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (res.ok) {
          // Sign in after successful signup
          await signIn('credentials', {
            email,
            password,
            callbackUrl: '/',
          });
        } else {
          const data = await res.json();
          setError(data.error || 'Something went wrong');
        }
      } catch (err) {
        setError('Failed to sign up');
      }
    } else {
      // Handle sign in
      try {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError('Invalid credentials');
        } else {
          onClose();
        }
      } catch (err) {
        setError('Failed to sign in');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-background p-8 rounded-lg w-full max-w-md border border-primary-hover relative">
        <h2 className="text-2xl mb-6 font-bold">
          {mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </h2>
        {error && (
          <div className="mb-4 p-2 text-sm text-red-500 bg-red-500/10 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn">
            {mode === 'signin' ? 'Sign In' : 'Sign Up'}
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