"use client";

import { useEffect, useState } from "react";
import { RoomType, RoomTypeFormData } from "@/types";
import AdminNavigation from "@/components/AdminNavigation";
import toast, { Toaster } from "react-hot-toast";

export default function RoomTypesPage() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<RoomType | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState<number | null>(null);

  // Fetch room types
  const fetchRoomTypes = async () => {
    const res = await fetch("/api/room-types");
    const data = await res.json();
    setRoomTypes(data);
  };

  useEffect(() => {
    fetchRoomTypes();
  }, []);

  const openAddModal = () => {
    setEditingType(null);
    setName("");
    setDescription("");
    setBasePrice(null);
    setModalOpen(true);
  };

  const openEditModal = (type: RoomType) => {
    setEditingType(type);
    setName(type.name);
    setDescription(type.description || "");
    setBasePrice(type.base_price);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name || basePrice === null) {
      toast.error("Please fill in all required fields");
      return;
    }

    const method = editingType ? "PUT" : "POST";
    const url = editingType ? `/api/room-types/${editingType.id}` : "/api/room-types";

    try {
      const response = await fetch(url, {
        method,
        body: JSON.stringify({ name, description, base_price: basePrice }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save room type:', errorText);
        toast.error(`Failed to save room type: ${errorText}`);
        return;
      }

      toast.success(editingType ? "Room type updated successfully!" : "Room type added successfully!");
      setModalOpen(false);
      fetchRoomTypes();
    } catch (error) {
      console.error('Error saving room type:', error);
      toast.error("An error occurred while saving the room type");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this room type?")) return;
    
    try {
      const response = await fetch(`/api/room-types/${id}`, { method: "DELETE" });
      
      if (!response.ok) {
        toast.error("Failed to delete room type");
        return;
      }
      
      toast.success("Room type deleted successfully!");
      fetchRoomTypes();
    } catch (error) {
      console.error('Error deleting room type:', error);
      toast.error("An error occurred while deleting the room type");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <AdminNavigation currentPage="room-types" />
      
      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">🏷️ Room Types Management</h2>
          <p className="text-gray-600 mt-1">Manage room categories and pricing</p>
        </div>

        <button
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={openAddModal}
        >
          Add Room Type
        </button>

      <table className="w-full border-collapse border border-black">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-black font-bold">Name</th>
            <th className="border border-black p-2 text-black font-bold">Description</th>
            <th className="border border-black p-2 text-black font-bold">Base Price (₱)</th>
            <th className="border border-black p-2 text-black font-bold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {roomTypes.map((type) => (
            <tr key={type.id} className="hover:bg-gray-50">
              <td className="border border-black p-2 text-black">{type.name}</td>
              <td className="border border-black p-2 text-black">{type.description || "-"}</td>
              <td className="border border-black p-2 text-black">{type.base_price?.toFixed(2)}</td>
              <td className="border border-black p-2 text-center">
                <button
                  className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 mx-1"
                  onClick={() => openEditModal(type)}
                >
                  Edit
                </button>
                <button
                  className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 mx-1"
                  onClick={() => handleDelete(Number(type.id))}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white rounded-xl shadow p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              {editingType ? "Edit Room Type" : "Add Room Type"}
            </h2>

            <div className="mb-2">
              <label className="block font-semibold mb-1 text-gray-800">Name</label>
              <input
                type="text"
                className="border border-gray-300 rounded w-full p-2 bg-white text-gray-800"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="mb-2">
              <label className="block font-semibold mb-1 text-gray-800">Description</label>
              <textarea
                className="border border-gray-300 rounded w-full p-2 bg-white text-gray-800"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="block font-semibold mb-1 text-gray-800">Base Price (₱)</label>
              <input
                type="number"
                className="border border-gray-300 rounded w-full p-2 bg-white text-gray-800"
                value={basePrice ?? ""}
                onChange={(e) => setBasePrice(Number(e.target.value))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
