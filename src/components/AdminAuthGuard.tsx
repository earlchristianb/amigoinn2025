"use client";

import { ReactNode } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface AdminAuthGuardProps {
  children: ReactNode;
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const { user, isLoaded, isAdmin, checkingAdmin } = useAdminAuth();

  // Loading state
  if (!isLoaded || checkingAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-4">You must be logged in to access this page.</p>
            <button 
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not admin - redirect to unauthorized page
  if (isAdmin === false) {
    window.location.href = '/unauthorized';
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Redirecting...</div>
        </div>
      </div>
    );
  }

  // Authorized - render the protected content
  return <>{children}</>;
}
