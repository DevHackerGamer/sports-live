import { useEffect, useState,useMemo } from 'react';
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
    const interval = setInterval(fetchReports, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch match and event details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
      const matchIds = [...new Set(reports.map(r => String(r.matchId)).filter(Boolean))];
      const missingMatchIds = matchIds.filter(id => !matchDetails[id]);

      if (matchIds.length > 0) {
        const matchResponses = await Promise.all(
          matchIds.map(id => apiClient.getMatchById(id))
        );

        const matchMap = {};
        matchResponses.forEach(res => {
          const match = res.data;
          if (!match) return;

          const key = String(match._id || match.id || match.matchId);
          if (!key) return;

          // Ensure homeTeam/awayTeam and date exist
          const homeTeam = match.homeTeam?.name || match.homeTeam || 'Home';
          const awayTeam = match.awayTeam?.name || match.awayTeam || 'Away';
          const date = match.date || match.utcDate || match.matchDate || new Date().toISOString();

          matchMap[key] = { ...match, homeTeam, awayTeam, date };
        });

        // Merge with existing matches
        setMatchDetails(prev => ({ ...prev, ...matchMap }));
      }


        // Fetch events for each match
        const eventResponses = await Promise.all(
          matchIds.map(id => apiClient.getMatchEvents(id))
        );
        const eventMap = {};
        eventResponses.forEach(res => {
          res.data.forEach(event => {
            const key = String(event._id || event.id);
            eventMap[key] = event;
          });
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
      setReports(prev =>
        prev.map(r =>
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
  const deleteReport = async id => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await apiClient.deleteReport(id);
      setReports(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      console.error('Failed to delete report:', err);
      alert('Failed to delete report. Check console.');
    }
  };

  // Reset filters
  const clearFilters = () => {
    setFilter('all');
    setSearch('');
  };

  // 
  // Filter and search reports
// Filter and search reports (title + description only)
const filteredReports = useMemo(() => {
  const searchLower = search.trim().toLowerCase();

  return reports.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter;

    // Only check title + description
    const searchable = [
      r.title || '',
      r.description || ''
    ].join(' ').toLowerCase();

    if (!searchLower) return matchesFilter;
    return matchesFilter && searchable.includes(searchLower);
  });
}, [reports, filter, search]);



  // Render states
  if (loading) return <p>Loading reports...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="reports-page">
      <h2>Bug Reports</h2>

      <div className="reports-controls">
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="in-review">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <input
          type="text"
          placeholder="Search by Title or Description"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <button onClick={clearFilters} className="clear-btn">
          Clear Filters
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Match</th>
            <th>Event</th>
            <th>Title</th>
            <th>Description</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredReports.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center' }}>
                No reports found.
              </td>
            </tr>
          ) : (
            filteredReports.map(r => (
              <tr
                key={r._id}
                className={r.status !== 'resolved' ? 'unresolved-report' : 'resolved-report'}
              >
                <td>
  {matchDetails[String(r.matchId)]
    ? (() => {
        const m = matchDetails[String(r.matchId)];
        return `${m.homeTeam} vs ${m.awayTeam} (${new Date(m.date).toLocaleDateString()})`;
      })()
    : 'Unknown Match'}
</td>
                <td>
                  {eventDetails[String(r.eventId)]
                    ? (() => {
                        const e = eventDetails[String(r.eventId)];
                        const type = e?.type || e?.eventType || 'Event';
                        const minute = e?.minute ? `${e.minute}' ` : '';
                        const player = e?.player ? ` - ${e.player}` : '';
                        const desc = e?.description ? ` (${e.description})` : '';
                        return `${minute}${type}${player}${desc}`;
                      })()
                    : 'Unknown Event'}
                </td>
                <td>{r.title || '-'}</td>
                <td>{r.description || '-'}</td>
                <td>
                  <select value={r.status} onChange={e => updateStatus(r._id, e.target.value)}>
                    <option value="open">Open</option>
                    <option value="in-review">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </td>
                <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                <td>
                  <button className="delete-btn" onClick={() => deleteReport(r._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ReportsPage;
