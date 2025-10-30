import { useCallback, useState } from 'react';

export type UseOverlaysParams = {
  setActiveViewId: (id: string) => void;
};

export function useOverlays({ setActiveViewId }: UseOverlaysParams) {
  const [protectOpen, setProtectOpen] = useState(false);

  const [fieldDrawerOpen, setFieldDrawerOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const openProtect = useCallback((viewId: string) => {
    setActiveViewId(viewId);
    setProtectOpen(true);
  }, [setActiveViewId]);
  const closeProtect = useCallback(() => setProtectOpen(false), []);

  const openFieldDrawer = useCallback((fieldId?: string) => {
    setEditingFieldId(fieldId ?? null);
    setFieldDrawerOpen(true);
  }, []);
  const closeFieldDrawer = useCallback(() => { setFieldDrawerOpen(false); setEditingFieldId(null); }, []);

  const openFilter = useCallback(() => setFilterOpen(true), []);
  const closeFilter = useCallback(() => setFilterOpen(false), []);

  const openColor = useCallback(() => setColorOpen(true), []);
  const closeColor = useCallback(() => setColorOpen(false), []);

  return {
    // states
    protectOpen,
    fieldDrawerOpen,
    editingFieldId,
    filterOpen,
    colorOpen,
    // actions
    openProtect,
    closeProtect,
    openFieldDrawer,
    closeFieldDrawer,
    openFilter,
    closeFilter,
    openColor,
    closeColor,
  } as const;
}