"use client";

import { SignIn } from "@clerk/nextjs";
import { useUser, useClerk } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
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
  }, [isLoaded, user, router]);

  // Show loading if checking admin status
  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Verifying access...</div>
      </div>
    );
  }
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
          <p className="text-lg text-gray-600">Made by Earl na cutie</p>
        </div>

        {/* Clerk Sign In */}
        <div className="w-full flex justify-center">
          <SignIn 
            appearance={{
              elements: {
                formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm normal-case',
                card: 'shadow-xl',
                rootBox: 'w-full flex justify-center',
                cardBox: 'w-full max-w-md',
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
