import React from 'react';
import Tabs from '../Tabs';
import type { View } from '../../types';

export type HeaderTabsProps = {
  views: View[];
  activeViewId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onProtectClick: (id: string) => void;
};

const HeaderTabs: React.FC<HeaderTabsProps> = ({
  views,
  activeViewId,
  onSelect,
  onAdd,
  onRename,
  onDuplicate,
  onDelete,
  onProtectClick,
}) => {
  return (
    <Tabs
      views={views}
      activeId={activeViewId}
      onSelect={onSelect}
      onAdd={onAdd}
      onRename={onRename}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onProtectClick={onProtectClick}
    />
  );
};

export default HeaderTabs;