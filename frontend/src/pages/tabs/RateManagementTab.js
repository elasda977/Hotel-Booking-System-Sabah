import React, { useState, useEffect, useRef } from 'react';
import authAxios from '../../utils/auth';
import { useToast } from '../../components/Toast/ToastContext';
import './RateManagementTab.css';

function RateManagementTab() {
  const toast = useToast();
  const [rates, setRates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', room_category: '', start_date: '', end_date: '', rate_multiplier: 1.2, is_active: true });
  const [editing, setEditing] = useState(null);
  const [historyModal, setHistoryModal] = useState({ show: false, rateId: null, logs: [] });
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => { fetchRates(); fetchCategories(); }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRates = async () => {
    try {
      const res = await authAxios.get('/rates');
      setRates(res.data);
    } catch (err) { console.error('Error fetching rates:', err); }
  };

  const fetchCategories = async () => {
    try {
      const res = await authAxios.get('/categories');
      setCategories(res.data);
    } catch (err) { console.error('Error fetching categories:', err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, rate_multiplier: parseFloat(form.rate_multiplier) };
      if (editing) {
        await authAxios.put(`/rates/${editing.id}`, payload);
        toast.success('Rate rule updated!');
      } else {
        await authAxios.post('/rates', payload);
        toast.success('Rate rule created!');
      }
      resetForm();
      fetchRates();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save rate rule');
    }
  };

  const handleEdit = (rate) => {
    setEditing(rate);
    setForm({ name: rate.name, room_category: rate.room_category || '', start_date: rate.start_date, end_date: rate.end_date, rate_multiplier: rate.rate_multiplier, is_active: rate.is_active });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rate rule?')) return;
    try {
      await authAxios.delete(`/rates/${id}`);
      toast.success('Rate rule deleted!');
      fetchRates();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete rate rule');
    }
  };

  const viewHistory = async (rateId) => {
    try {
      const res = await authAxios.get(`/rates/${rateId}/history`);
      setHistoryModal({ show: true, rateId, logs: res.data });
    } catch (err) { console.error('Error fetching history:', err); }
  };

  const resetForm = () => {
    setForm({ name: '', room_category: '', start_date: '', end_date: '', rate_multiplier: 1.2, is_active: true });
    setEditing(null);
  };

  return (
    <div className="rate-management">
      <h2>Rate Rules</h2>

      <div className="maintenance-section">
        <h3>{editing ? 'Edit Rate Rule' : 'Add Rate Rule'}</h3>
        <form onSubmit={handleSubmit} className="maintenance-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="rate-name">Name *</label>
              <input id="rate-name" type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="e.g. Peak Season Surcharge" />
            </div>
            <div className="form-group">
              <label htmlFor="rate-category">Room Category</label>
              <select id="rate-category" value={form.room_category} onChange={(e) => setForm({...form, room_category: e.target.value})}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="rate-start">Start Date *</label>
              <input id="rate-start" type="date" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} required />
            </div>
            <div className="form-group">
              <label htmlFor="rate-end">End Date *</label>
              <input id="rate-end" type="date" value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} required />
            </div>
            <div className="form-group">
              <label htmlFor="rate-multiplier">Rate Multiplier *</label>
              <input id="rate-multiplier" type="number" step="0.1" min="0.1" value={form.rate_multiplier} onChange={(e) => setForm({...form, rate_multiplier: e.target.value})} required />
            </div>
            <div className="form-group">
              <label htmlFor="rate-active" className="checkbox-label">
                <input id="rate-active" type="checkbox" checked={form.is_active} onChange={(e) => setForm({...form, is_active: e.target.checked})} />
                Active
              </label>
            </div>
          </div>
          <div className="form-actions-row">
            <button type="submit" className="btn-submit">{editing ? 'Update' : 'Add'} Rate Rule</button>
            {editing && <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="table-container" ref={dropdownRef}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Multiplier</th>
              <th>Status</th>
              <th>Created By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rates.map(r => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.room_category || 'All'}</td>
                <td>{new Date(r.start_date).toLocaleDateString('en-GB')}</td>
                <td>{new Date(r.end_date).toLocaleDateString('en-GB')}</td>
                <td>x{r.rate_multiplier}</td>
                <td><span className={`status-badge ${r.is_active ? 'status-confirmed' : 'status-cancelled'}`}>{r.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>{r.created_by_name || '-'}</td>
                <td>
                  <div className="action-dropdown">
                    <button className="action-dropdown-trigger" onClick={() => setOpenDropdown(openDropdown === r.id ? null : r.id)}>&#8942;</button>
                    {openDropdown === r.id && (
                      <div className="action-dropdown-menu">
                        <button onClick={() => { handleEdit(r); setOpenDropdown(null); }}>Edit</button>
                        <button onClick={() => { viewHistory(r.id); setOpenDropdown(null); }}>History</button>
                        <button className="danger" onClick={() => { handleDelete(r.id); setOpenDropdown(null); }}>Delete</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {historyModal.show && (
        <div className="image-modal" onClick={() => setHistoryModal({ show: false, rateId: null, logs: [] })} role="dialog" aria-modal="true" aria-label="Rate rule history">
          <div className="room-assign-modal" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setHistoryModal({ show: false, rateId: null, logs: [] })} aria-label="Close rate history">&times;</button>
            <h2>Rate Rule History</h2>
            {historyModal.logs.length === 0 ? (
              <p>No history found.</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr><th>Action</th><th>Changed By</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {historyModal.logs.map(log => (
                      <tr key={log.id}>
                        <td><span className={`status-badge ${log.action === 'created' ? 'status-confirmed' : log.action === 'deleted' ? 'status-cancelled' : 'status-pending'}`}>{log.action}</span></td>
                        <td>{log.changed_by_name || '-'}</td>
                        <td>{new Date(log.changed_at).toLocaleString('en-GB')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RateManagementTab;
