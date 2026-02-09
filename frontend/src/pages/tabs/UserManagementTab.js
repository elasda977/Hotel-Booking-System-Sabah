import React, { useState, useEffect } from 'react';
import authAxios from '../../utils/auth';
import './UserManagementTab.css';

function UserManagementTab() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee', status: 'active' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await authAxios.get('/users');
      setUsers(res.data);
    } catch (err) { console.error('Error fetching users:', err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const payload = { name: form.name, email: form.email, role: form.role, status: form.status };
        if (form.password) payload.password = form.password;
        await authAxios.put(`/users/${editing.id}`, payload);
        alert('User updated!');
      } else {
        await authAxios.post('/users', form);
        alert('User created!');
      }
      resetForm();
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save user');
    }
  };

  const handleEdit = (user) => {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, status: user.status });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await authAxios.delete(`/users/${id}`);
      alert('User deleted!');
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', role: 'employee', status: 'active' });
    setEditing(null);
    setShowForm(false);
  };

  return (
    <div className="user-management">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>User Management</h2>
        <button className={showForm ? "btn-small btn-danger" : "btn-small btn-success"} onClick={() => { showForm ? resetForm() : setShowForm(true); }} style={{ padding: '0.6rem 1.2rem', fontSize: '1rem' }}>
          {showForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {showForm && (
        <div className="maintenance-section" style={{ marginBottom: '2rem' }}>
          <h3>{editing ? 'Edit User' : 'Add New User'}</h3>
          <form onSubmit={handleSubmit} className="maintenance-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="user-name">Name *</label>
                <input id="user-name" type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label htmlFor="user-email">Email *</label>
                <input id="user-email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label htmlFor="user-password">{editing ? 'Password (leave blank to keep)' : 'Password *'}</label>
                <input id="user-password" type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required={!editing} />
              </div>
              <div className="form-group">
                <label htmlFor="user-role">Role *</label>
                <select id="user-role" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="user-status">Status</label>
                <select id="user-status" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-submit">{editing ? 'Update' : 'Create'} User</button>
          </form>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>#{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td><span className={`status-badge ${user.role === 'admin' ? 'status-confirmed' : 'status-pending'}`}>{user.role}</span></td>
                <td><span className={`status-badge ${user.status === 'active' ? 'status-confirmed' : 'status-cancelled'}`}>{user.status}</span></td>
                <td>{new Date(user.created_at).toLocaleDateString('en-GB')}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-small btn-info" onClick={() => handleEdit(user)}>Edit</button>
                    <button className="btn-small btn-danger" onClick={() => handleDelete(user.id)}>Delete</button>
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

export default UserManagementTab;
