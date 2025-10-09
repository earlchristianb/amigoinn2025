"use client";

import { useEffect, useState } from "react";
import AdminNavigation from "@/components/AdminNavigation";
import AdminAuthGuard from "@/components/AdminAuthGuard";
import toast, { Toaster } from "react-hot-toast";
import { useUser } from "@clerk/nextjs";

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'assistant';
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const { user: clerkUser } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<'admin' | 'assistant'>('assistant');
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Check current user's role
  useEffect(() => {
    const checkRole = async () => {
      if (clerkUser?.emailAddresses?.[0]?.emailAddress) {
        const response = await fetch('/api/auth/check-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: clerkUser.emailAddresses[0].emailAddress })
        });
        const data = await response.json();
        setCurrentUserRole(data.role);
        
        // If not admin, redirect
        if (data.role !== 'admin') {
          window.location.href = '/dashboard';
        }
      }
    };
    checkRole();
  }, [clerkUser]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setRole('assistant');
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name || !email || !role) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (submitting) return;

    setSubmitting(true);
    try {
      const method = editingUser ? "PUT" : "POST";
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";

      const response = await fetch(url, {
        method,
        body: JSON.stringify({ name, email, role }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to save user");
        return;
      }

      toast.success(editingUser ? "User updated successfully!" : "User added successfully!");
      setModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error("An error occurred while saving the user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    
    try {
      const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
      
      if (!response.ok) {
        toast.error("Failed to delete user");
        return;
      }
      
      toast.success("User deleted successfully!");
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error("An error occurred while deleting the user");
    }
  };

  if (loading || !currentUserRole) {
    return (
      <AdminAuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50">
          <AdminNavigation currentPage="users" />
          <div className="flex items-center justify-center h-96">
            <div className="text-xl text-gray-600">Loading...</div>
          </div>
        </div>
      </AdminAuthGuard>
    );
  }

  // Only admin can access this page
  if (currentUserRole !== 'admin') {
    return (
      <AdminAuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50">
          <AdminNavigation currentPage="users" />
          <div className="flex items-center justify-center h-96">
            <div className="text-xl text-red-600">Access Denied: Admin Only</div>
          </div>
        </div>
      </AdminAuthGuard>
    );
  }

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50">
        <Toaster position="top-right" />
        <AdminNavigation currentPage="users" />
        
        <main className="p-6">
          <div className="mb-8">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent mb-3">
              👥 User Management
            </h2>
            <p className="text-gray-700 text-lg">Manage admin and assistant users</p>
          </div>

          <button
            className="mb-6 px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-900 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold"
            onClick={openAddModal}
          >
            ➕ Add User
          </button>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-stone-200 overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-amber-50 to-stone-50 border-b-2 border-stone-200">
                  <th className="p-4 text-left text-gray-900 font-bold">Name</th>
                  <th className="p-4 text-left text-gray-900 font-bold">Email</th>
                  <th className="p-4 text-left text-gray-900 font-bold">Role</th>
                  <th className="p-4 text-left text-gray-900 font-bold">Created At</th>
                  <th className="p-4 text-center text-gray-900 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-stone-100 hover:bg-amber-50/50 transition-colors">
                    <td className="p-4 text-gray-900 font-medium">{user.name}</td>
                    <td className="p-4 text-gray-700">{user.email}</td>
                    <td className="p-4">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          👑 Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                          👤 Assistant
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-700">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 mx-1 transition-colors"
                        onClick={() => openEditModal(user)}
                      >
                        Edit
                      </button>
                      <button
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 mx-1 transition-colors"
                        onClick={() => handleDelete(user.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>

        {/* Add/Edit User Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl border-2 border-stone-200">
              <h3 className="text-xl font-bold mb-4 text-gray-900">
                {editingUser ? "Edit User" : "Add User"}
              </h3>

              <div className="mb-4">
                <label className="block font-semibold mb-1 text-gray-800">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="border-2 border-stone-200 rounded-xl px-4 py-3 w-full bg-white text-gray-800 focus:border-amber-700 focus:ring-2 focus:ring-amber-200 transition-all duration-300"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., John Doe"
                  disabled={submitting}
                />
              </div>

              <div className="mb-4">
                <label className="block font-semibold mb-1 text-gray-800">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="border-2 border-stone-200 rounded-xl px-4 py-3 w-full bg-white text-gray-800 focus:border-amber-700 focus:ring-2 focus:ring-amber-200 transition-all duration-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., john@example.com"
                  disabled={submitting}
                />
              </div>

              <div className="mb-4">
                <label className="block font-semibold mb-1 text-gray-800">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  className="border-2 border-stone-200 rounded-xl px-4 py-3 w-full bg-white text-gray-800 focus:border-amber-700 focus:ring-2 focus:ring-amber-200 transition-all duration-300"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'assistant')}
                  disabled={submitting}
                >
                  <option value="assistant">👤 Assistant</option>
                  <option value="admin">👑 Admin</option>
                </select>
                <p className="text-xs text-gray-600 mt-2">
                  <strong>Admin:</strong> Full access to all features including reports and user management<br />
                  <strong>Assistant:</strong> Can manage bookings, guests, rooms, but no access to reports or users
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    submitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-amber-700 text-white hover:bg-amber-800'
                  }`}
                  onClick={handleSave}
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminAuthGuard>
  );
}

