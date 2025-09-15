import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';
import '../../styles/ReportsPage.css';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchDetails, setMatchDetails] = useState({});
  const [eventDetails, setEventDetails] = useState({});

  // Fetch reports
  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getReports();
      // API returns { success: true, data: [...] }
      setReports(res.data || []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to fetch reports. Check console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 10000); // optional polling
    return () => clearInterval(interval);
  }, []);
useEffect(() => {
  const fetchDetails = async () => {
    try {
      const matchIds = [...new Set(reports.map(r => r.matchId).filter(Boolean))];
      const eventIds = [...new Set(reports.map(r => r.eventId).filter(Boolean))];

      // Fetch matches
      const matches = await Promise.all(matchIds.map(id => apiClient.getMatchById(id)));
      const matchMap = {};
      matches.forEach(match => { matchMap[match._id] = match; });
      setMatchDetails(matchMap);

      // Fetch events from the matches
      const eventsArrays = await Promise.all(
        matchIds.map(id => apiClient.getMatchEvents(id))
      );

      const eventMap = {};
      eventsArrays.forEach(events => {
        events.data.forEach(event => { eventMap[event._id] = event; });
      });
      setEventDetails(eventMap);

    } catch (err) {
      console.error('Failed to fetch match/event details', err);
    }
  };

  if (reports.length) fetchDetails();
}, [reports]);

  // Update report status
  const updateStatus = async (id, status) => {
    if (!window.confirm(`Change report status to "${status}"?`)) return;
    try {
      await apiClient.updateReport(id, { status });
      setReports((prev) =>
        prev.map((r) =>
          r._id === id
            ? {
                ...r,
                status,
                resolvedAt: status === 'resolved' ? new Date().toISOString() : r.resolvedAt,
              }
            : r
        )
      );
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status. Check console.');
    }
  };

  // Delete a report
  const deleteReport = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await apiClient.deleteReport(id);
      setReports((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      console.error('Failed to delete report:', err);
      alert('Failed to delete report. Check console.');
    }
  };

  // Filter and search reports
  const filteredReports = reports.filter((r) => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const matchesSearch =
      r.matchId?.toString().includes(search) ||
      (r.eventId?.toString() || '').includes(search) ||
      (r.title?.toLowerCase().includes(search.toLowerCase()) || false);
    return matchesFilter && matchesSearch;
  });

  // Render states
  if (loading) return <p>Loading reports...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!filteredReports.length) return <p>No reports found.</p>;

  return (
    <div className="reports-page">
      <h2>Bug Reports</h2>

      <div className="reports-controls">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="in-review">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <input
          type="text"
          placeholder="Search by Match ID, Event ID, or Title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <table>
        <thead>
          <tr>
            <th>Match</th>
            <th>Event</th>
            <th>Title</th>
            <th>Description</th>
            <th>Status</th>
            <th>Reported By</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredReports.map((r) => (
            <tr
              key={r._id}
              className={r.status !== 'resolved' ? 'unresolved-report' : 'resolved-report'}
            >
              <td>
  {matchDetails[r.matchId]
    ? `${matchDetails[r.matchId].homeTeam} vs ${matchDetails[r.matchId].awayTeam}`
    : r.matchId || '-'}
</td>
<td>
  {eventDetails[r.eventId]
    ? eventDetails[r.eventId].type // or .name depending on your event structure
    : r.eventId || '-'}
</td>
              <td>{r.title || '-'}</td>
              <td>{r.description || '-'}</td>
              <td>
                <select value={r.status} onChange={(e) => updateStatus(r._id, e.target.value)}>
                  <option value="open">Open</option>
                  <option value="in-review">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </td>
              <td>{r.reportedBy || 'Guest'}</td>
              <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
              <td>
                <button className="delete-btn" onClick={() => deleteReport(r._id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReportsPage;
