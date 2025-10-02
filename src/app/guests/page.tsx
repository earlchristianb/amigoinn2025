"use client";

import { useEffect, useState } from "react";
import { Guest, GuestFormData } from "@/types";
import AdminNavigation from "@/components/AdminNavigation";
import AdminAuthGuard from "@/components/AdminAuthGuard";
import toast, { Toaster } from "react-hot-toast";

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalGuests, setTotalGuests] = useState(0);

  // Fetch guests
  const fetchGuests = async () => {
    const res = await fetch("/api/guests");
    const data = await res.json();
    setGuests(data);
    setTotalGuests(data.length);
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalGuests / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedGuests = guests.slice(startIndex, endIndex);

  // Reset to first page when page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  const openAddModal = () => {
    setEditingGuest(null);
    setName("");
    setEmail("");
    setPhone("");
    setModalOpen(true);
  };

  const openEditModal = (guest: Guest) => {
    setEditingGuest(guest);
    setName(guest.name);
    setEmail(guest.email || "");
    setPhone(guest.phone || "");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Name is required");
      return;
    }

    const method = editingGuest ? "PUT" : "POST";
    const url = editingGuest ? `/api/guests/${editingGuest.id}` : "/api/guests";

    try {
      const response = await fetch(url, {
        method,
        body: JSON.stringify({ name, email: email || null, phone: phone || null }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save guest:', errorText);
        toast.error(`Failed to save guest: ${errorText}`);
        return;
      }

      toast.success(editingGuest ? "Guest updated successfully!" : "Guest added successfully!");
      setModalOpen(false);
      fetchGuests();
    } catch (error) {
      console.error('Error saving guest:', error);
      toast.error("An error occurred while saving the guest");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this guest?")) return;
    
    try {
      const response = await fetch(`/api/guests/${id}`, { method: "DELETE" });
      
      if (!response.ok) {
        toast.error("Failed to delete guest");
        return;
      }
      
      toast.success("Guest deleted successfully!");
      fetchGuests();
    } catch (error) {
      console.error('Error deleting guest:', error);
      toast.error("An error occurred while deleting the guest");
    }
  };

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <AdminNavigation currentPage="guests" />
      
      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">👥 Guests Management</h2>
          <p className="text-gray-600 mt-1">Manage guest information and bookings</p>
        </div>

      <div className="mb-4 flex justify-between items-center">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={openAddModal}
        >
          Add Guest
        </button>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-gray-700">Show:</label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 bg-white text-black"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-gray-700">entries</span>
          </div>
          
          <div className="text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, totalGuests)} of {totalGuests} entries
          </div>
        </div>
      </div>

      <table className="w-full border-collapse border border-black">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-black font-bold">Name</th>
            <th className="border border-black p-2 text-black font-bold">Email</th>
            <th className="border border-black p-2 text-black font-bold">Phone</th>
            <th className="border border-black p-2 text-black font-bold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedGuests.map((guest) => (
            <tr key={guest.id} className="hover:bg-gray-50">
              <td className="border border-black p-2 text-black">{guest.name}</td>
              <td className="border border-black p-2 text-black">{guest.email || "-"}</td>
              <td className="border border-black p-2 text-black">{guest.phone || "-"}</td>
              <td className="border border-black p-2 text-center">
                <button
                  className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 mx-1"
                  onClick={() => openEditModal(guest)}
                >
                  Edit
                </button>
                <button
                  className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 mx-1"
                  onClick={() => handleDelete(Number(guest.id))}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <div className="text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded bg-white text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              First
            </button>
            
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded bg-white text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              if (pageNum > totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 border border-gray-300 rounded ${
                    currentPage === pageNum
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-black hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded bg-white text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded bg-white text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white rounded-xl shadow p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              {editingGuest ? "Edit Guest" : "Add Guest"}
            </h2>
            <form onSubmit={handleSave} >

           
            <div className="mb-2">
              <label className="block font-semibold mb-1 text-gray-800">Name</label>
              <input
                type="text"
                required
                className="border border-gray-300 rounded w-full p-2 bg-white text-gray-800"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="mb-2">
              <label className="block font-semibold mb-1 text-gray-800">Email</label>
              <input
                type="email"
                required
                className="border border-gray-300 rounded w-full p-2 bg-white text-gray-800"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="block font-semibold mb-1 text-gray-800">Phone</label>
              <input
                type="text"
                className="border border-gray-300 rounded w-full p-2 bg-white text-gray-800"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                type="submit"
              >
                Save
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
      </main>
      </div>
    </AdminAuthGuard>
  );
}
