import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import Toast from './Toast';
import './Toast.css';

const ToastContext = createContext(null);

const AUTO_DISMISS_MS = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 4000,
};

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, removing: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type, removing: false }]);
    const timer = setTimeout(() => removeToast(id), AUTO_DISMISS_MS[type] || 4000);
    timersRef.current[id] = timer;
    return id;
  }, [removeToast]);

  const toast = useCallback(
    Object.assign((message) => addToast(message, 'info'), {
      success: (message) => addToast(message, 'success'),
      error: (message) => addToast(message, 'error'),
      warning: (message) => addToast(message, 'warning'),
      info: (message) => addToast(message, 'info'),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
