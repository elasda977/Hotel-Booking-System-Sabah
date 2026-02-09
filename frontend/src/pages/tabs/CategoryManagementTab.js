import React, { useState, useEffect } from 'react';
import authAxios from '../../utils/auth';
import './CategoryManagementTab.css';

function CategoryManagementTab() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', base_price: '', capacity: '' });
  const [editing, setEditing] = useState(null);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await authAxios.get('/categories');
      setCategories(res.data);
    } catch (err) { console.error('Error fetching categories:', err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, base_price: parseFloat(form.base_price), capacity: parseInt(form.capacity) };
      if (editing) {
        await authAxios.put(`/categories/${editing.id}`, payload);
        alert('Category updated!');
      } else {
        await authAxios.post('/categories', payload);
        alert('Category created!');
      }
      setForm({ name: '', description: '', base_price: '', capacity: '' });
      setEditing(null);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save category');
    }
  };

  const handleEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description || '', base_price: cat.base_price, capacity: cat.capacity });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await authAxios.delete(`/categories/${id}`);
      alert('Category deleted!');
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete category');
    }
  };

  return (
    <div className="category-management">
      <h2>Room Categories</h2>

      <div className="maintenance-section">
        <h3>{editing ? 'Edit Category' : 'Add Category'}</h3>
        <form onSubmit={handleSubmit} className="maintenance-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="cat-name">Name *</label>
              <input id="cat-name" type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label htmlFor="cat-price">Base Price (RM) *</label>
              <input id="cat-price" type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({...form, base_price: e.target.value})} required />
            </div>
            <div className="form-group">
              <label htmlFor="cat-capacity">Capacity *</label>
              <input id="cat-capacity" type="number" value={form.capacity} onChange={(e) => setForm({...form, capacity: e.target.value})} required />
            </div>
            <div className="form-group full-width">
              <label htmlFor="cat-desc">Description</label>
              <textarea id="cat-desc" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows="2" />
            </div>
          </div>
          <div className="form-actions-row">
            <button type="submit" className="btn-submit">{editing ? 'Update' : 'Add'} Category</button>
            {editing && <button type="button" className="btn-cancel" onClick={() => { setEditing(null); setForm({ name: '', description: '', base_price: '', capacity: '' }); }}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Base Price (RM)</th>
              <th>Capacity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td>{cat.name}</td>
                <td>{cat.description || '-'}</td>
                <td>RM{cat.base_price}</td>
                <td>{cat.capacity}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-small btn-info" onClick={() => handleEdit(cat)}>Edit</button>
                    <button className="btn-small btn-danger" onClick={() => handleDelete(cat.id)}>Delete</button>
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

export default CategoryManagementTab;
