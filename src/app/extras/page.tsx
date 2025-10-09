"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";
import AdminNavigation from "@/components/AdminNavigation";
import AdminAuthGuard from "@/components/AdminAuthGuard";
import toast, { Toaster } from 'react-hot-toast';

interface Extra {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_package: boolean;
  included_nights: number | null;
  created_at: string;
  updated_at: string;
}

export default function ExtrasPage() {
  const [extras, setExtras] = useState<Extra[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<Extra | null>(null);
  
  // Form states
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [isPackage, setIsPackage] = useState<boolean>(false);
  const [includedNights, setIncludedNights] = useState<string>("");
  
  // Loading states
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    fetchExtras();
  }, []);

  const fetchExtras = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/extras");
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setExtras(data);
      } else {
        console.error('Extras API returned non-array data:', data);
        setExtras([]);
        setError('Invalid data format received from server');
      }
    } catch (error) {
      console.error('Error fetching extras:', error);
      setExtras([]);
      setError('Failed to load extras. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingExtra(null);
    setName("");
    setDescription("");
    setPrice("");
    setIsPackage(false);
    setIncludedNights("");
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (extra: Extra) => {
    setEditingExtra(extra);
    setName(extra.name);
    setDescription(extra.description || "");
    setPrice(extra.price.toString());
    setIsPackage(extra.is_package || false);
    setIncludedNights(extra.included_nights ? extra.included_nights.toString() : "");
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!name || !price) {
      setError("Name and price are required");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Price must be a valid positive number");
      return;
    }

    if (isPackage && (!includedNights || parseInt(includedNights) < 1)) {
      setError("Package must have at least 1 included night");
      return;
    }

    if (submitting) return;

    setSubmitting(true);
    try {
      const url = editingExtra ? `/api/extras/${editingExtra.id}` : "/api/extras";
      const method = editingExtra ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          price: priceNum,
          is_package: isPackage,
          included_nights: isPackage ? parseInt(includedNights) : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save extra');
      }

      await fetchExtras();
      toast.success(editingExtra ? "Extra updated successfully!" : "Extra created successfully!");
      setModalOpen(false);
      setName("");
      setDescription("");
      setPrice("");
      setError("");
    } catch (error) {
      console.error("Error submitting extra:", error);
      setError(error instanceof Error ? error.message : "Failed to save extra");
      toast.error(error instanceof Error ? error.message : "Failed to save extra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this extra?")) return;

    try {
      const response = await fetch(`/api/extras/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete extra');
      }

      await fetchExtras();
      toast.success("Extra deleted successfully!");
    } catch (error) {
      console.error("Error deleting extra:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete extra");
    }
  };

  // Pagination
  const totalExtras = extras.length;
  const totalPages = Math.ceil(totalExtras / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedExtras = Array.isArray(extras) ? extras.slice(startIndex, endIndex) : [];

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <AdminAuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50">
          <AdminNavigation currentPage="extras" />
          <main className="p-6">
            <div className="flex justify-center items-center py-12">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-stone-200">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200"></div>
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-amber-700 absolute top-0 left-0"></div>
                  </div>
                  <p className="text-gray-900 font-semibold text-lg">Loading extras...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </AdminAuthGuard>
    );
  }

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50">
      <Toaster position="top-right" />
      <AdminNavigation currentPage="extras" />
      
      <main className="p-6">
        <div className="mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent mb-3">💵 Extras Management</h2>
          <p className="text-gray-700 text-lg">Manage additional services, tours, and payables 🏨</p>
        </div>

        {/* Error State */}
        {error && !loading && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-800 mb-2">Error loading extras</h3>
                <div className="text-sm text-red-700 bg-white/50 rounded-lg px-4 py-2 mb-4">{error}</div>
                <button
                  onClick={fetchExtras}
                  className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

      <div className="mb-4 flex justify-between items-center">
        <button
          className="px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-900 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold"
          onClick={openAddModal}
        >
          ➕ Add Extra
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
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-stone-200 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-amber-50 to-stone-50 border-b-2 border-stone-200">
              <th className="p-4 text-left text-gray-900 font-bold">Name</th>
              <th className="p-4 text-left text-gray-900 font-bold">Description</th>
              <th className="p-4 text-left text-gray-900 font-bold">Price</th>
              <th className="p-4 text-left text-gray-900 font-bold">Type</th>
              <th className="p-4 text-center text-gray-900 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedExtras.map((extra) => (
              <tr key={extra.id} className="border-b border-stone-100 hover:bg-amber-50/50 transition-colors">
                <td className="p-4 text-gray-900 font-medium">{extra.name}</td>
                <td className="p-4 text-gray-700">{extra.description || '-'}</td>
                <td className="p-4 text-gray-900 font-semibold">₱{extra.price.toFixed(2)}</td>
                <td className="p-4">
                  {extra.is_package ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                      📦 Package ({extra.included_nights}N)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                      🎯 Extra
                    </span>
                  )}
                </td>
                <td className="p-4 text-center">
                  <button
                    className="px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 mx-1 transition-colors"
                    onClick={() => openEditModal(extra)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 mx-1 transition-colors"
                    onClick={() => handleDelete(extra.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {extras.length === 0 && !loading && (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">No extras found. Click "Add Extra" to create one.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-between items-center bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-stone-200">
          <div className="text-gray-700 font-medium">
            Page {currentPage} of {totalPages}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-stone-300 rounded-lg bg-white text-black hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              First
            </button>
            
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-stone-300 rounded-lg bg-white text-black hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              if (pageNum > totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1.5 border border-stone-300 rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-amber-700 text-white border-amber-700'
                      : 'bg-white text-black hover:bg-stone-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-stone-300 rounded-lg bg-white text-black hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
            
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-stone-300 rounded-lg bg-white text-black hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg w-full rounded-2xl bg-white p-6 shadow-xl border-2 border-stone-200">
            <Dialog.Title className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-3xl">💵</span> {editingExtra ? "Edit Extra" : "Add Extra"}
            </Dialog.Title>
            
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Island Hopping Tour"
                  className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 bg-white focus:border-amber-700 focus:ring-2 focus:ring-amber-200 transition-all duration-300 font-medium text-gray-800"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description of the service or tour"
                  rows={3}
                  className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 bg-white focus:border-amber-700 focus:ring-2 focus:ring-amber-200 transition-all duration-300 font-medium text-gray-800"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Price (₱) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={price}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setPrice(value);
                  }}
                  placeholder="0"
                  className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 bg-white focus:border-amber-700 focus:ring-2 focus:ring-amber-200 transition-all duration-300 font-medium text-gray-800"
                  disabled={submitting}
                />
              </div>

              {/* Package Fields */}
              <div className="border-t-2 border-stone-200 pt-4 mt-4">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="isPackage"
                    checked={isPackage}
                    onChange={(e) => {
                      setIsPackage(e.target.checked);
                      if (!e.target.checked) {
                        setIncludedNights("");
                      }
                    }}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    disabled={submitting}
                  />
                  <label htmlFor="isPackage" className="text-sm font-semibold text-gray-800 cursor-pointer">
                    📦 This is a Package (includes room nights)
                  </label>
                </div>

                {isPackage && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Included Nights <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={includedNights}
                      onChange={(e) => setIncludedNights(e.target.value)}
                      placeholder="e.g., 2 for a 3D2N package"
                      className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 bg-white focus:border-amber-700 focus:ring-2 focus:ring-amber-200 transition-all duration-300 font-medium text-gray-800"
                      disabled={submitting}
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      💡 This is the number of room-nights included in the package price. For example, a 3D2N package includes 2 nights.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !name || !price}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    submitting || !name || !price
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-700 to-amber-900 text-white hover:shadow-lg hover:scale-105'
                  }`}
                >
                  {submitting ? 'Saving...' : (editingExtra ? 'Update Extra' : 'Add Extra')}
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-400 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </main>
      </div>
    </AdminAuthGuard>
  );
}

