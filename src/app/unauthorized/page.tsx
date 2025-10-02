"use client";

import Image from "next/image";
import { useUser, useClerk } from "@clerk/nextjs";
import { useEffect } from "react";

export default function UnauthorizedPage() {
  const { user } = useUser();
  const { signOut } = useClerk();

  // Automatically sign out the user when they reach this page
  useEffect(() => {
    const autoSignOut = async () => {
      if (user) {
        try {
          await signOut();
        } catch (error) {
          console.error('Error signing out:', error);
        }
      }
    };
    
    autoSignOut();
  }, [user, signOut]);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 flex flex-col items-center">
        {/* Logo Section */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/amigo-logo.jpg"
              alt="Amigo Inn Siargao"
              width={120}
              height={120}
              className="rounded-full shadow-lg"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Amigo Inn</h1>
          <p className="text-lg text-gray-600">Siargao Island</p>
        </div>

        {/* Unauthorized Message */}
        <div className="w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-2">
              Your account ({user?.emailAddresses?.[0]?.emailAddress}) is not authorized to access this system.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Only authorized administrators can access the Amigo Inn management system.
            </p>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleSignOut}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>If you believe this is an error, please contact the system administrator.</p>
        </div>
      </div>
    </div>
  );
}
