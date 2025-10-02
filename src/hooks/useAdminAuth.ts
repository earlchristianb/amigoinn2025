"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export function useAdminAuth() {
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user?.emailAddresses?.[0]?.emailAddress) {
        try {
          const response = await fetch('/api/auth/check-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.emailAddresses[0].emailAddress })
          });
          const data = await response.json();
          setIsAdmin(data.isAdmin);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setCheckingAdmin(false);
    };

    if (isLoaded && user) {
      checkAdminStatus();
    } else if (isLoaded && !user) {
      setCheckingAdmin(false);
    }
  }, [isLoaded, user]);

  return {
    user,
    isLoaded,
    isAdmin,
    checkingAdmin
  };
}
