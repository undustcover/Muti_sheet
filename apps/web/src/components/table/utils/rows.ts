// Row style utility functions extracted from DataTable.tsx

export function makeRowContainerStyle(templateColumns: string, totalWidth: number, offsetY: number) {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    transform: `translateY(${offsetY}px)`,
    display: 'grid',
    gridTemplateColumns: templateColumns,
    minWidth: `${totalWidth}px`,
    borderBottom: 'none',
  } as const;
}

export function makeIndexHeaderStyle(indexColWidth: number) {
  return {
    position: 'sticky',
    left: 0,
    zIndex: 12,
    background: '#f7faff',
    width: `${indexColWidth}px`,
    color: '#999',
    cursor: 'default',
    userSelect: 'none',
    borderRight: '1px solid #eee',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as const;
}