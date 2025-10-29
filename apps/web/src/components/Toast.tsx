import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ToastSeverity = 'info' | 'success' | 'warning' | 'error';

type ToastItem = { id: number; message: string; severity: ToastSeverity; actionLabel?: string; onAction?: () => void; duration?: number };

type ToastContextValue = {
  show: (message: string, severity?: ToastSeverity, options?: { actionLabel?: string; onAction?: () => void; duration?: number }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const show = useCallback((message: string, severity: ToastSeverity = 'info', options?: { actionLabel?: string; onAction?: () => void; duration?: number }) => {
    const id = Date.now() + Math.random();
    const item: ToastItem = { id, message, severity, actionLabel: options?.actionLabel, onAction: options?.onAction, duration: options?.duration } as ToastItem;
    setToasts((prev) => [...prev, item]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, options?.duration ?? 2500);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, display: 'grid', gap: 8, zIndex: 2000 }}>
        {toasts.map((t) => {
          const bg = t.severity === 'success' ? '#16a34a' : t.severity === 'warning' ? '#f59e0b' : t.severity === 'error' ? '#ef4444' : '#334155';
          return (
            <div key={t.id} style={{ background: bg, color: '#fff', padding: '8px 12px', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.15)', maxWidth: 360, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ lineHeight: 1.4 }}>{t.message}</div>
              {t.actionLabel && (
                <button
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 0, borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}
                  onClick={() => { t.onAction?.(); setToasts((prev) => prev.filter((tt) => tt.id !== t.id)); }}
                >{t.actionLabel}</button>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};