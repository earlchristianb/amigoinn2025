"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new admin page
    router.push('/admin');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50 flex items-center justify-center">
      <div className="text-lg text-gray-600">Redirecting to admin login...</div>
    </div>
  );
}
