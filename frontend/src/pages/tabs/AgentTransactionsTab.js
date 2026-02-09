import React, { useState, useEffect } from 'react';
import authAxios from '../../utils/auth';
import './AgentTransactionsTab.css';

function AgentTransactionsTab() {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [agentData, setAgentData] = useState(null);
  const [summaries, setSummaries] = useState([]);

  useEffect(() => { fetchSummaries(); }, []);

  const fetchSummaries = async () => {
    try {
      const res = await authAxios.get('/agents/transactions-summary');
      setSummaries(res.data);
      // Extract agents list from summaries
      setAgents(res.data.map(s => s.agent));
    } catch (err) { console.error('Error fetching summaries:', err); }
  };

  const fetchAgentBookings = async (agentId) => {
    if (!agentId) { setAgentData(null); return; }
    try {
      const res = await authAxios.get(`/agents/${agentId}/bookings`);
      setAgentData(res.data);
    } catch (err) { console.error('Error fetching agent bookings:', err); }
  };

  const handleAgentChange = (e) => {
    const id = e.target.value;
    setSelectedAgent(id);
    fetchAgentBookings(id);
  };

  return (
    <div className="agent-transactions">
      <h2>Agent Booking Transactions</h2>

      <div className="filter-section">
        <div className="form-group">
          <label htmlFor="agent-filter">Filter by Agent</label>
          <select id="agent-filter" value={selectedAgent} onChange={handleAgentChange}>
            <option value="">-- All Agents (Summary) --</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name} - {a.company || 'Independent'}</option>)}
          </select>
        </div>
      </div>

      {!selectedAgent && (
        <>
          <h3>Agent Summary Overview</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Company</th>
                  <th>Total Bookings</th>
                  <th>Confirmed</th>
                  <th>Pending</th>
                  <th>Cancelled</th>
                  <th>Revenue (RM)</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map(s => (
                  <tr key={s.agent.id}>
                    <td>{s.agent.name}</td>
                    <td>{s.agent.company || '-'}</td>
                    <td>{s.total_bookings}</td>
                    <td>{s.confirmed}</td>
                    <td>{s.pending}</td>
                    <td>{s.cancelled}</td>
                    <td>RM{s.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedAgent && agentData && (
        <>
          <div className="summary-cards">
            <div className="stat-card">
              <div className="stat-info">
                <h3>Total Bookings</h3>
                <p className="stat-value">{agentData.summary.total}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>Revenue</h3>
                <p className="stat-value">RM{agentData.summary.revenue.toFixed(2)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>Confirmed</h3>
                <p className="stat-value">{agentData.summary.confirmed}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>Pending</h3>
                <p className="stat-value">{agentData.summary.pending}</p>
              </div>
            </div>
          </div>

          <h3>Bookings by {agentData.agent.name}</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Room</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {agentData.bookings.map(b => (
                  <tr key={b.id}>
                    <td>#{b.id}</td>
                    <td>{b.customer_name}</td>
                    <td>{b.room_type} - {b.room_number}</td>
                    <td>{new Date(b.check_in).toLocaleDateString('en-GB')}</td>
                    <td>{new Date(b.check_out).toLocaleDateString('en-GB')}</td>
                    <td>RM{b.total_price}</td>
                    <td><span className={`status-badge status-${b.status}`}>{b.status}</span></td>
                    <td>{new Date(b.created_at).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
                {agentData.bookings.length === 0 && (
                  <tr><td colSpan="8" style={{ textAlign: 'center', color: '#999' }}>No bookings found for this agent</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default AgentTransactionsTab;
