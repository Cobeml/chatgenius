'use client';

import { useState, useRef, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import ReCAPTCHA from "react-google-recaptcha";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
}

const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function AuthModal({ isOpen, onClose, mode }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<string>('');
  const [attemptCount, setAttemptCount] = useState(0);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const lastAttemptRef = useRef<number>(0);

  useEffect(() => {
    if (mode === 'signup') {
      validatePassword(password);
    }
  }, [password, mode]);

  const validatePassword = (pass: string) => {
    if (pass.length === 0) {
      setPasswordStrength('');
      return false;
    }
    if (pass.length < MIN_PASSWORD_LENGTH) {
      setPasswordStrength('Password must be at least 8 characters long');
      return false;
    }
    if (!PASSWORD_REGEX.test(pass)) {
      setPasswordStrength('Password must contain uppercase, lowercase, number, and special character');
      return false;
    }
    setPasswordStrength('Password strength: Strong');
    return true;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttemptRef.current;
    
    // If more than 5 attempts, require 30 second wait
    if (attemptCount >= 5 && timeSinceLastAttempt < 30000) {
      setError(`Too many attempts. Please wait ${Math.ceil((30000 - timeSinceLastAttempt) / 1000)} seconds`);
      return false;
    }
    
    // If less than 2 seconds between attempts
    if (timeSinceLastAttempt < 2000) {
      setError('Please wait a moment before trying again');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!checkRateLimit()) {
      return;
    }

    if (mode === 'signup' && !validatePassword(password)) {
      setError('Please meet all password requirements');
      return;
    }

    // Get reCAPTCHA token
    const token = recaptchaRef.current?.getValue();
    if (!token) {
      setError('Please complete the CAPTCHA verification');
      return;
    }

    setIsLoading(true);
    lastAttemptRef.current = Date.now();
    setAttemptCount(prev => prev + 1);

    try {
      if (mode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email, 
            password,
            recaptchaToken: token 
          }),
        });

        if (res.ok) {
          // Sign in after successful signup
          const signInResult = await signIn('credentials', {
            email,
            password,
            callbackUrl: '/',
            redirect: false,
          });

          if (signInResult?.error) {
            setError('Failed to sign in after signup');
          } else {
            onClose();
          }
        } else {
          const data = await res.json();
          setError(data.error || 'Something went wrong');
        }
      } else {
        // Handle sign in
        const result = await signIn('credentials', {
          email,
          password,
          recaptchaToken: token,
          redirect: false,
        });

        if (result?.error) {
          if (result.error === 'CredentialsSignin') {
            setError('Invalid email or password');
          } else {
            setError(result.error);
          }
        } else {
          setAttemptCount(0); // Reset on successful login
          onClose();
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
      recaptchaRef.current?.reset();
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
            disabled={isLoading}
          />
          <div className="space-y-1">
            <input
              type="password"
              placeholder="Password"
              className="input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={MIN_PASSWORD_LENGTH}
            />
            {mode === 'signup' && passwordStrength && (
              <div className={`text-sm ${
                passwordStrength.includes('Strong') 
                  ? 'text-green-500' 
                  : 'text-yellow-500'
              }`}>
                {passwordStrength}
              </div>
            )}
          </div>
          <div className="flex justify-center my-2">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
              theme="dark"
            />
          </div>
          <button 
            type="submit" 
            className="btn disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-text hover:text-text-hover"
          disabled={isLoading}
        >
          ✕
        </button>
      </div>
    </div>
  );
} 