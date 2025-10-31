import React from 'react';
import Tabs from '../Tabs';
import type { View } from '../../types';
import type { ViewKind } from '../../services/viewsStore';

export type HeaderTabsProps = {
  views: View[];
  activeViewId: string;
  tableId: string;
  onSelect: (id: string) => void;
  onAddWithKind: (kind: ViewKind) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onProtectClick: (id: string) => void;
};

const HeaderTabs: React.FC<HeaderTabsProps> = ({
  views,
  activeViewId,
  tableId,
  onSelect,
  onAddWithKind,
  onRename,
  onDuplicate,
  onDelete,
  onProtectClick,
}) => {
  return (
    <Tabs
      views={views}
      activeId={activeViewId}
      tableId={tableId}
      onSelect={onSelect}
      onAddWithKind={onAddWithKind}
      onRename={onRename}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onProtectClick={onProtectClick}
    />
  );
};

export default HeaderTabs;