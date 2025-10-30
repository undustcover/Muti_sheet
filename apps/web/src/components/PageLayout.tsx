import React from 'react';

interface PageLayoutProps {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

export default function PageLayout({ sidebar, header, toolbar, children }: PageLayoutProps) {
  return (
    <div style={{ display: 'flex' }}>
      {sidebar}
      <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {header}
        </div>
        {toolbar && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
            {toolbar}
          </div>
        )}
        <div style={{ padding: 0, overflow: 'visible', flex: 1, minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}