import React, { useState, useEffect, useRef } from 'react';
import authAxios from '../../utils/auth';
import { useToast } from '../../components/Toast/ToastContext';
import './HolidayManagementTab.css';

function HolidayManagementTab() {
  const toast = useToast();
  const [holidays, setHolidays] = useState([]);
  const [form, setForm] = useState({ name: '', date: '', rate_multiplier: 1.5, is_blackout: false });
  const [editing, setEditing] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => { fetchHolidays(); }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await authAxios.get('/holidays');
      setHolidays(res.data);
    } catch (err) { console.error('Error fetching holidays:', err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, rate_multiplier: parseFloat(form.rate_multiplier) };
      if (editing) {
        await authAxios.put(`/holidays/${editing.id}`, payload);
        toast.success('Holiday updated!');
      } else {
        await authAxios.post('/holidays', payload);
        toast.success('Holiday created!');
      }
      setForm({ name: '', date: '', rate_multiplier: 1.5, is_blackout: false });
      setEditing(null);
      fetchHolidays();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save holiday');
    }
  };

  const handleEdit = (holiday) => {
    setEditing(holiday);
    setForm({ name: holiday.name, date: holiday.date, rate_multiplier: holiday.rate_multiplier, is_blackout: holiday.is_blackout });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this holiday?')) return;
    try {
      await authAxios.delete(`/holidays/${id}`);
      toast.success('Holiday deleted!');
      fetchHolidays();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete holiday');
    }
  };

  return (
    <div className="holiday-management">
      <h2>Holiday Management</h2>

      <div className="maintenance-section">
        <h3>{editing ? 'Edit Holiday' : 'Add Holiday'}</h3>
        <form onSubmit={handleSubmit} className="maintenance-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="holiday-name">Name *</label>
              <input id="holiday-name" type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="e.g. Hari Raya Aidilfitri" />
            </div>
            <div className="form-group">
              <label htmlFor="holiday-date">Date *</label>
              <input id="holiday-date" type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} required />
            </div>
            <div className="form-group">
              <label htmlFor="holiday-multiplier">Rate Multiplier *</label>
              <input id="holiday-multiplier" type="number" step="0.1" min="1" value={form.rate_multiplier} onChange={(e) => setForm({...form, rate_multiplier: e.target.value})} required />
            </div>
            <div className="form-group">
              <label htmlFor="holiday-blackout" className="checkbox-label">
                <input id="holiday-blackout" type="checkbox" checked={form.is_blackout} onChange={(e) => setForm({...form, is_blackout: e.target.checked})} />
                Blackout Date (block bookings)
              </label>
            </div>
          </div>
          <div className="form-actions-row">
            <button type="submit" className="btn-submit">{editing ? 'Update' : 'Add'} Holiday</button>
            {editing && <button type="button" className="btn-cancel" onClick={() => { setEditing(null); setForm({ name: '', date: '', rate_multiplier: 1.5, is_blackout: false }); }}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="table-container" ref={dropdownRef}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Date</th>
              <th>Rate Multiplier</th>
              <th>Blackout</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {holidays.map(h => (
              <tr key={h.id}>
                <td>{h.name}</td>
                <td>{new Date(h.date).toLocaleDateString('en-GB')}</td>
                <td>x{h.rate_multiplier}</td>
                <td><span className={`status-badge ${h.is_blackout ? 'status-cancelled' : 'status-confirmed'}`}>{h.is_blackout ? 'Yes' : 'No'}</span></td>
                <td>
                  <div className="action-dropdown">
                    <button className="action-dropdown-trigger" onClick={() => setOpenDropdown(openDropdown === h.id ? null : h.id)}>&#8942;</button>
                    {openDropdown === h.id && (
                      <div className="action-dropdown-menu">
                        <button onClick={() => { handleEdit(h); setOpenDropdown(null); }}>Edit</button>
                        <button className="danger" onClick={() => { handleDelete(h.id); setOpenDropdown(null); }}>Delete</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HolidayManagementTab;
