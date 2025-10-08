"use client";

import { SignIn } from "@clerk/nextjs";
import { useUser, useClerk } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isLoaded && user?.emailAddresses?.[0]?.emailAddress) {
        setCheckingAdmin(true);
        const userEmail = user.emailAddresses[0].emailAddress;

        try {
          const response = await fetch('/api/auth/check-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail })
          });
          const data = await response.json();

          if (data.isAdmin) {
            router.push('/dashboard');
          } else {
            // Sign out the non-admin user and redirect
            await signOut();
            router.push('/unauthorized');
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          router.push('/unauthorized');
        }
        setCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [isLoaded, user, router, signOut]);

  // Show loading if checking admin status
  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Verifying access...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Image
                src="/amigo-logo.jpg"
                alt="Amigo Inn Siargao"
                width={70}
                height={70}
                className="rounded-full shadow-xl ring-4 ring-amber-100"
                priority
              />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent">
                  Amigo Inn Siargao
                </h1>
                <p className="text-gray-600 text-sm mt-1">Admin Portal 🔐</p>
              </div>
            </div>
            <a
              href="/"
              className="bg-gradient-to-r from-stone-500 to-stone-700 text-white px-6 py-2.5 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300 font-medium"
            >
              ← Back to Homepage
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md space-y-8 flex flex-col items-center">
          {/* Info Section */}
          <div className="text-center mb-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border-2 border-stone-200 mb-8">
              <div className="flex justify-center mb-6">
                <div className="bg-gradient-to-r from-amber-600 to-amber-800 rounded-full p-4 shadow-lg">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Access Only</h2>
              <p className="text-gray-600 mb-4">This area is restricted to authorized personnel only.</p>
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mt-4">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Only registered admin accounts can access the management system.
                </p>
              </div>
            </div>
          </div>

          {/* Clerk Sign In */}
          <div className="w-full flex justify-center">
            <SignIn 
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-amber-700 hover:bg-amber-800 text-sm normal-case',
                  card: 'shadow-xl',
                  rootBox: 'w-full flex justify-center',
                  cardBox: 'w-full max-w-md',
                }
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

