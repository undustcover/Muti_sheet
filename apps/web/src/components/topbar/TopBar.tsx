import React from 'react';
import HeaderTabs, { type HeaderTabsProps } from './HeaderTabs';

export type TopBarProps = HeaderTabsProps & {
  // 渲染 Breadcrumb：支持直接节点或渲染函数
  breadcrumb?: React.ReactNode;
  renderBreadcrumbs?: () => React.ReactNode;
};

const TopBar: React.FC<TopBarProps> = ({ breadcrumb, renderBreadcrumbs, ...tabsProps }) => {
  const crumbs = breadcrumb ?? renderBreadcrumbs?.();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing)', background: 'transparent', borderBottom: 'none', padding: '8px 12px' }}>
      {crumbs ? (
        <div data-breadcrumb-container>
          {crumbs}
        </div>
      ) : null}
      <HeaderTabs {...tabsProps} />
    </div>
  );
};

export default TopBar;