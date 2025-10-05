"use client";

import { useEffect, useState } from "react";
import { Booking } from "@/types";
import AdminNavigation from "@/components/AdminNavigation";
import AdminAuthGuard from "@/components/AdminAuthGuard";
import toast, { Toaster } from "react-hot-toast";
import Papa from "papaparse";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ReportsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [monthFilterType, setMonthFilterType] = useState<string>("created_at"); // Default to "created_at"
  const [loading, setLoading] = useState(true);

  // Utility function to format numbers with commas
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Calculate monthly earnings for the current year
  const calculateMonthlyEarnings = () => {
    const currentYear = new Date().getFullYear();
    const monthlyEarnings = Array.from({ length: 12 }, (_, index) => {
      const month = index; // 0-11 for Jan-Dec
      const monthStart = new Date(currentYear, month, 1);
      const monthEnd = new Date(currentYear, month + 1, 0);
      
      const monthBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.created_at);
        return bookingDate >= monthStart && bookingDate <= monthEnd;
      });
      
      const totalEarnings = monthBookings.reduce((sum, booking) => {
        const totalPaid = booking.payments?.reduce((paymentSum, payment) => 
          paymentSum + Number(payment.amount), 0) || 0;
        return sum + totalPaid;
      }, 0);
      
      return {
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        earnings: totalEarnings
      };
    });
    
    return monthlyEarnings;
  };

  const monthlyEarnings = calculateMonthlyEarnings();

  // Chart data configuration
  const chartData = {
    labels: monthlyEarnings.map(item => item.month),
    datasets: [
      {
        label: 'Monthly Earnings (₱)',
        data: monthlyEarnings.map(item => item.earnings),
        borderColor: 'rgb(180, 83, 9)', // amber-700
        backgroundColor: 'rgba(180, 83, 9, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(180, 83, 9)',
        pointBorderColor: 'rgb(255, 255, 255)',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: 'rgb(180, 83, 9)',
        pointHoverBorderColor: 'rgb(255, 255, 255)',
        pointHoverBorderWidth: 3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          color: 'rgb(55, 65, 81)', // gray-700
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgb(180, 83, 9)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            return `Earnings: ₱${formatCurrency(context.parsed.y)}`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgb(107, 114, 128)', // gray-500
          font: {
            size: 12,
            weight: 'normal' as const,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(156, 163, 175, 0.2)', // gray-400 with opacity
          drawBorder: false,
        },
        ticks: {
          color: 'rgb(107, 114, 128)', // gray-500
          font: {
            size: 12,
            weight: 'normal' as const,
          },
          callback: function(value: any) {
            return '₱' + formatCurrency(value);
          },
        },
      },
    },
    elements: {
      point: {
        hoverBackgroundColor: 'rgb(180, 83, 9)',
      },
    },
  };

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Summary statistics
  const [summary, setSummary] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    totalPaid: 0,
    totalPending: 0,
    paidCount: 0,
    partialCount: 0,
    unpaidCount: 0,
  });


  // Fetch all bookings
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch("/api/bookings");
        const data = await res.json();
        if (Array.isArray(data)) {
          setBookings(data);
          setFilteredBookings(data);
          calculateSummary(data);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        toast.error("Failed to load bookings");
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  // Filter bookings by month
  useEffect(() => {
    if (selectedMonth) {
      const filtered = bookings.filter((booking) => {
        const filterMonth = new Date(selectedMonth);
        
        if (monthFilterType === "created_at") {
          // Filter by created_at date
          const createdAt = new Date(booking.created_at);
          return (
            createdAt.getFullYear() === filterMonth.getFullYear() && 
            createdAt.getMonth() === filterMonth.getMonth()
          );
        } else {
          // Filter by check-in/check-out dates (existing logic)
          return booking.booking_rooms.some((room) => {
            const checkInDate = new Date(room.check_in_date);
            const checkOutDate = new Date(room.check_out_date);

            return (
              (checkInDate.getFullYear() === filterMonth.getFullYear() &&
                checkInDate.getMonth() === filterMonth.getMonth()) ||
              (checkOutDate.getFullYear() === filterMonth.getFullYear() &&
                checkOutDate.getMonth() === filterMonth.getMonth())
            );
          });
        }
      });
      setFilteredBookings(filtered);
      calculateSummary(filtered);
    } else {
      setFilteredBookings(bookings);
      calculateSummary(bookings);
    }
    // Reset to first page when filter changes
    setCurrentPage(1);
  }, [selectedMonth, monthFilterType, bookings]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredBookings.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

  // Reset to first page when page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  // Calculate summary statistics
  const calculateSummary = (data: Booking[]) => {
    const stats = {
      totalBookings: data.length,
      totalRevenue: 0,
      totalPaid: 0,
      totalPending: 0,
      paidCount: 0,
      partialCount: 0,
      unpaidCount: 0,
    };

    data.forEach((booking) => {
      stats.totalRevenue += booking.total_price || 0;
      stats.totalPaid += booking.total_paid || 0;
      stats.totalPending += booking.remaining || 0;

      if (booking.remaining <= 0) {
        stats.paidCount++;
      } else if (booking.total_paid > 0) {
        stats.partialCount++;
      } else {
        stats.unpaidCount++;
      }
    });

    setSummary(stats);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredBookings.length === 0) {
      toast.error("No bookings to export");
      return;
    }

    const csvData = filteredBookings.map((booking) => ({
      "Booking ID": booking.id,
      "Guest Name": booking.guest?.name || "Unknown",
      "Guest Email": booking.guest?.email || "N/A",
      "Guest Phone": booking.guest?.phone || "N/A",
      "Rooms": booking.booking_rooms
        .map((br) => br.room?.room_number || "Unknown")
        .join("; "),
      "Room Types": booking.booking_rooms
        .map((br) => br.room?.type?.name || "Unknown")
        .join("; "),
      "Check-in Dates": booking.booking_rooms
        .map((br) => new Date(br.check_in_date).toLocaleDateString())
        .join("; "),
      "Check-out Dates": booking.booking_rooms
        .map((br) => new Date(br.check_out_date).toLocaleDateString())
        .join("; "),
      "Total Price (₱)": formatCurrency(booking.total_price || 0),
      "Discount (₱)": formatCurrency(booking.discount || 0),
      "Grand Total (₱)": formatCurrency((booking.total_price || 0) - (booking.discount || 0)),
      "Total Paid (₱)": formatCurrency(booking.total_paid || 0),
      "Remaining (₱)": formatCurrency(booking.remaining || 0),
      "Payment Status":
        booking.remaining <= 0
          ? "Paid"
          : booking.total_paid > 0
          ? "Partial"
          : "Unpaid",
      "Extras": booking.booking_extras
        ?.map((e) => `${e.label} (${e.quantity}x ₱${formatCurrency(e.price)})`)
        .join("; ") || "None",
      "Created At": new Date(booking.created_at).toLocaleString(),
      "Updated At": new Date(booking.updated_at).toLocaleString(),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const monthLabel = selectedMonth
      ? new Date(selectedMonth).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        })
      : "All";
    
    link.download = `bookings-report-${monthLabel}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("Report exported successfully!");
  };

  // Export Summary CSV
  const handleExportSummaryCSV = () => {
    const summaryData = [
      {
        Report: "Monthly Booking Summary",
        Month: selectedMonth
          ? new Date(selectedMonth).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
            })
          : "All Time",
        "Total Bookings": summary.totalBookings,
        "Total Revenue (₱)": formatCurrency(summary.totalRevenue),
        "Total Paid (₱)": formatCurrency(summary.totalPaid),
        "Pending Payments (₱)": formatCurrency(summary.totalPending),
        "Paid Bookings": summary.paidCount,
        "Partial Payments": summary.partialCount,
        "Unpaid Bookings": summary.unpaidCount,
        "Generated At": new Date().toLocaleString(),
      },
    ];

    const csv = Papa.unparse(summaryData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const monthLabel = selectedMonth
      ? new Date(selectedMonth).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        })
      : "All";
    
    link.download = `summary-report-${monthLabel}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("Summary exported successfully!");
  };

  if (loading) {
    return (
      <AdminAuthGuard>
        <div className="min-h-screen bg-gray-50">
          <AdminNavigation currentPage="reports" />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-600">Loading reports...</div>
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
      <AdminNavigation currentPage="reports" />

      <main className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent mb-3">📊 Reports & Analytics</h2>
          <p className="text-gray-700 text-lg">Generate and export booking reports 🏨</p>
        </div>

        {/* Filter Section */}
        <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-stone-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full border border-gray-300 rounded p-2 bg-white text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter Type
              </label>
              <select
                value={monthFilterType}
                onChange={(e) => setMonthFilterType(e.target.value)}
                className="w-full border border-gray-300 rounded p-2 bg-white text-black"
              >
                <option value="created_at">Created At</option>
                <option value="checkin_checkout">Check-in/Check-out</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setSelectedMonth("")}
                className="w-full md:w-auto px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Clear Filter
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Total Bookings</h3>
            <p className="text-3xl font-bold text-gray-900">{summary.totalBookings}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-600">₱{formatCurrency(summary.totalRevenue)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Total Paid</h3>
            <p className="text-3xl font-bold text-amber-700">₱{formatCurrency(summary.totalPaid)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Pending Payments</h3>
            <p className="text-3xl font-bold text-red-600">₱{formatCurrency(summary.totalPending)}</p>
          </div>
        </div>

        {/* Monthly Earnings Chart */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-stone-200 p-6">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-3xl">📈</span> Monthly Earnings Overview
              </h3>
              <p className="text-gray-600">
                Track your monthly earnings throughout {new Date().getFullYear()} to identify trends and peak seasons
              </p>
            </div>
            
            <div className="relative h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
            
            {/* Chart Statistics */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-amber-50 to-stone-50 rounded-xl p-4 border border-stone-200">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Best Month</p>
                    <p className="text-lg font-bold text-amber-700">
                      {monthlyEarnings.reduce((max, current) => 
                        current.earnings > max.earnings ? current : max, monthlyEarnings[0]
                      )?.month || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-amber-50 to-stone-50 rounded-xl p-4 border border-stone-200">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Highest Earnings</p>
                    <p className="text-lg font-bold text-amber-700">
                      ₱{formatCurrency(Math.max(...monthlyEarnings.map(m => m.earnings)))}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-amber-50 to-stone-50 rounded-xl p-4 border border-stone-200">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Average Monthly</p>
                    <p className="text-lg font-bold text-amber-700">
                      ₱{formatCurrency(
                        monthlyEarnings.reduce((sum, month) => sum + month.earnings, 0) / 12
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
              <span className="text-gray-700">Paid</span>
              <span className="text-xl font-bold text-gray-900">{summary.paidCount}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded">
              <span className="text-gray-700">Partial</span>
              <span className="text-xl font-bold text-yellow-600">{summary.partialCount}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded">
              <span className="text-gray-700">Unpaid</span>
              <span className="text-xl font-bold text-red-600">{summary.unpaidCount}</span>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Reports</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportCSV}
              className="px-6 py-3 bg-amber-700 text-white rounded hover:bg-amber-800 font-medium"
              disabled={filteredBookings.length === 0}
            >
              📥 Export Detailed Report (CSV)
            </button>
            <button
              onClick={handleExportSummaryCSV}
              className="px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
            >
              📊 Export Summary Report (CSV)
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            {filteredBookings.length} booking(s) will be included in the detailed report
          </p>
        </div>

        {/* Preview Table */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Preview Data</h3>
            
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
                Showing {startIndex + 1} to {Math.min(endIndex, filteredBookings.length)} of {filteredBookings.length} entries
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-black">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-2 text-black font-bold">Guest</th>
                  <th className="border border-black p-2 text-black font-bold">Rooms</th>
                  <th className="border border-black p-2 text-black font-bold">Total (₱)</th>
                  <th className="border border-black p-2 text-black font-bold">Paid (₱)</th>
                  <th className="border border-black p-2 text-black font-bold">Remaining (₱)</th>
                  <th className="border border-black p-2 text-black font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="border border-black p-2 text-black">{booking.guest?.name || "Unknown"}</td>
                    <td className="border border-black p-2 text-black">
                      {booking.booking_rooms?.map((br) => br.room?.room_number || "?").join(", ")}
                    </td>
                    <td className="border border-black p-2 text-black">{formatCurrency(booking.total_price || 0)}</td>
                    <td className="border border-black p-2 text-black">{formatCurrency(booking.total_paid || 0)}</td>
                    <td className="border border-black p-2 text-black">{formatCurrency(booking.remaining || 0)}</td>
                    <td className="border border-black p-2 text-black">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        booking.remaining <= 0 ? 'bg-gray-600 text-white' :
                        booking.total_paid > 0 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.remaining <= 0 ? 'Paid' : booking.total_paid > 0 ? 'Partial' : 'Unpaid'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredBookings.length === 0 && (
              <p className="text-center text-gray-500 py-8">No bookings found for the selected period</p>
            )}
          </div>

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
                          ? 'bg-amber-700 text-white'
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
        </div>
      </main>
      </div>
    </AdminAuthGuard>
  );
}

