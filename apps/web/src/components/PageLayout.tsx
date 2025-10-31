import React from 'react';
import { colors, effects } from '../design/tokens';

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
        <div style={{ padding: 12, borderBottom: `1px solid ${colors.dividerSubtle}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `linear-gradient(180deg, ${colors.topbarGradientDeepStart} 0%, ${colors.topbarGradientDeepEnd} 100%)` }}>
          {header}
        </div>
        {toolbar && (
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.dividerSubtle}`, background: colors.toolbarGlassBg, backdropFilter: effects.toolbarBackdrop, position: 'relative', zIndex: 100 }}>
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