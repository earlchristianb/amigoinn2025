"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";

interface AdminNavigationProps {
  currentPage: string;
}

export default function AdminNavigation({ currentPage }: AdminNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useClerk();

  const navigationItems = [
    { href: "/dashboard", label: "📅 Dashboard", key: "dashboard" },
    { href: "/bookings", label: "📋 Bookings", key: "bookings" },
    { href: "/rooms", label: "🏠 Rooms", key: "rooms" },
    { href: "/guests", label: "👥 Guests", key: "guests" },
    { href: "/room-types", label: "🏷️ Room Types", key: "room-types" },
    { href: "/reports", label: "📊 Reports", key: "reports" },
  ];

  const handleLogout = async () => {
    await signOut({ redirectUrl: '/' });
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-800">🏨 Amigo Inn Admin</h1>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  currentPage === item.key
                    ? "text-black border-b-2 border-black"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-white rounded transition-colors"
              style={{backgroundColor: '#8B4513'}}
              onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#A0522D'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#8B4513'}
            >
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50">
              {navigationItems.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className={`block px-3 py-2 text-base font-medium ${
                    currentPage === item.key
                      ? "text-black font-semibold"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
