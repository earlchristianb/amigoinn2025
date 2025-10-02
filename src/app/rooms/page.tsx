"use client";

import { useEffect, useState } from "react";
import { Room, RoomType, RoomFormData, RoomTypeFormData } from "@/types";
import AdminNavigation from "@/components/AdminNavigation";
import toast, { Toaster } from "react-hot-toast";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomNumber, setRoomNumber] = useState("");
  const [roomTypeId, setRoomTypeId] = useState<number | null>(null);

  // Fetch rooms
  const fetchRooms = async () => {
    const res = await fetch("/api/rooms");
    const data = await res.json();
    setRooms(data);
  };

  // Fetch room types
  const fetchRoomTypes = async () => {
    const res = await fetch("/api/room-types");
    const data = await res.json();
    setRoomTypes(data);
  };

  useEffect(() => {
    fetchRooms();
    fetchRoomTypes();
  }, []);

  const openAddModal = () => {
    setEditingRoom(null);
    setRoomNumber("");
    setRoomTypeId(null);
    setModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setRoomNumber(room.room_number);
    setRoomTypeId(Number(room.room_type_id));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!roomNumber || !roomTypeId) {
      toast.error("Please fill in all required fields");
      return;
    }

    const method = editingRoom ? "PUT" : "POST";
    const url = editingRoom ? `/api/rooms/${editingRoom.id}` : "/api/rooms";

    try {
      const response = await fetch(url, {
        method,
        body: JSON.stringify({ room_number: roomNumber, room_type_id: roomTypeId }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save room:', errorText);
        toast.error(`Failed to save room: ${errorText}`);
        return;
      }

      toast.success(editingRoom ? "Room updated successfully!" : "Room added successfully!");
      setModalOpen(false);
      fetchRooms();
    } catch (error) {
      console.error('Error saving room:', error);
      toast.error("An error occurred while saving the room");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this room?")) return;
    
    try {
      const response = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
      
      if (!response.ok) {
        toast.error("Failed to delete room");
        return;
      }
      
      toast.success("Room deleted successfully!");
      fetchRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error("An error occurred while deleting the room");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <AdminNavigation currentPage="rooms" />
      
      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">🏠 Rooms Management</h2>
          <p className="text-gray-600 mt-1">Manage hotel rooms and room types</p>
        </div>

      <button
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={openAddModal}
      >
        Add Room
      </button>

      <table className="w-full border-collapse border border-black">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-black font-bold">Room Number</th>
            <th className="border border-black p-2 text-black font-bold">Room Type</th>
            <th className="border border-black p-2 text-black font-bold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id} className="hover:bg-gray-50">
              <td className="border border-black p-2 text-black">{room.room_number}</td>
              <td className="border border-black p-2 text-black">{room.type?.name}</td>
              <td className="border border-black p-2 text-center">
                <button
                  className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 mx-1"
                  onClick={() => openEditModal(room)}
                >
                  Edit
                </button>
                <button
                  className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 mx-1"
                  onClick={() => handleDelete(Number(room.id))}
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
            <h2 className="text-xl font-bold mb-4 text-gray-800">{editingRoom ? "Edit Room" : "Add Room"}</h2>

            <div className="mb-2">
              <label className="block font-semibold mb-1 text-gray-800">Room Number</label>
              <input
                type="text"
                className="border border-gray-300 rounded w-full p-2 bg-white text-gray-800"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="block font-semibold mb-1 text-gray-800">Room Type</label>
              <select
                className="border border-gray-300 rounded w-full p-2 bg-white text-gray-800"
                value={roomTypeId ?? ""}
                onChange={(e) => setRoomTypeId(Number(e.target.value))}
              >
                <option value="">Select Type</option>
                {roomTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
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
