// Table column utility functions extracted from DataTable.tsx

export function getColWidth(colWidths: Record<string, number>, fallbackWidth: number, columnId: string): number {
  return colWidths[columnId] ?? fallbackWidth;
}

export function buildTemplateColumns(
  indexColWidth: number,
  headerIds: string[],
  colWidths: Record<string, number>,
  fallbackWidth: number,
): string {
  const headerCols = headerIds.map((cid) => `${getColWidth(colWidths, fallbackWidth, cid)}px`).join(' ');
  return `${indexColWidth}px ${headerCols} ${fallbackWidth}px`;
}

export function calcTotalWidth(
  indexColWidth: number,
  headerIds: string[],
  colWidths: Record<string, number>,
  fallbackWidth: number,
  extraRightWidth: number,
): number {
  const headersTotal = headerIds.reduce((sum, cid) => sum + getColWidth(colWidths, fallbackWidth, cid), 0);
  return indexColWidth + headersTotal + extraRightWidth;
}

export function computeStickyLeft(
  indexColWidth: number,
  headerIds: string[],
  colWidths: Record<string, number>,
  fallbackWidth: number,
  idx: number,
): number {
  let left = indexColWidth;
  for (let i = 0; i < idx; i++) {
    left += getColWidth(colWidths, fallbackWidth, headerIds[i]);
  }
  return left;
}