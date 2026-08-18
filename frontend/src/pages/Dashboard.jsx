import { useState, useEffect, useMemo } from 'react';
import { Users, UserCheck, Clock, Search } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';

export default function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [dateFilter, setDateFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [dateFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      let url = `${baseUrl}/api/attendance`;
      if (dateFilter) {
        url += `?date=${dateFilter}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch attendance logs');
      }
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetLogs = async () => {
    if (!window.confirm("Are you sure you want to delete all attendance logs? This action cannot be undone.")) {
      return;
    }
    
    setIsResetting(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${baseUrl}/api/attendance/reset`, { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
      } else {
        alert("Failed to reset logs.");
      }
    } catch (error) {
      console.error('Failed to reset logs:', error);
      alert("Error resetting logs.");
    } finally {
      setIsResetting(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!nameFilter) return logs;
    const lowerName = nameFilter.toLowerCase();
    return logs.filter((log) => log.name?.toLowerCase().includes(lowerName));
  }, [logs, nameFilter]);

  const stats = useMemo(() => {
    const uniqueUsers = new Set(logs.map((l) => l.user_id)).size;
    const presentToday = new Set(
      logs
        .filter((l) => l.timestamp && isToday(parseISO(l.timestamp)))
        .map((l) => l.user_id)
    ).size;
    
    let lastScanTime = 'N/A';
    if (logs.length > 0) {
      const sorted = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      if (sorted[0].timestamp) {
        lastScanTime = format(parseISO(sorted[0].timestamp), 'h:mm a');
      }
    }

    return { uniqueUsers, presentToday, lastScanTime };
  }, [logs]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h2>
        <button
          onClick={handleResetLogs}
          disabled={isResetting}
          className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isResetting ? 'Resetting...' : 'Reset Logs'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Users in Logs</p>
            <p className="text-2xl font-bold text-slate-900">{stats.uniqueUsers}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Present Today</p>
            <p className="text-2xl font-bold text-slate-900">{stats.presentToday}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Last Scan Time</p>
            <p className="text-2xl font-bold text-slate-900">{stats.lastScanTime}</p>
          </div>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50">
          <div className="relative max-w-sm w-full">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm"
            />
          </div>
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm text-slate-700"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">User ID</th>
                <th className="px-6 py-3 font-medium">Time</th>
                <th className="px-6 py-3 font-medium">Confidence</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    Loading attendance logs...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No attendance logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{log.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-slate-500">{log.user_id}</td>
                    <td className="px-6 py-4">
                      {log.timestamp ? format(parseISO(log.timestamp), 'MMM d, yyyy h:mm a') : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {log.confidence ? `${(log.confidence * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {log.status || 'Present'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
