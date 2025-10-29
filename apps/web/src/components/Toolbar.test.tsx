import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Toolbar } from './Toolbar';

const baseProps = {
  columns: [{ id: 'id', name: 'ID', type: 'text' }],
  onColumnsChange: vi.fn(),
  rowHeight: 'low' as const,
  onRowHeightChange: vi.fn(),
  onFilterOpen: vi.fn(),
  onColorOpen: vi.fn(),
  onGroupOpen: vi.fn(),
  onSortOpen: vi.fn(),
  onShowAllHidden: vi.fn(),
  onAddRecord: vi.fn(),
};

describe('Toolbar', () => {
  it('renders key actions and changes row height', async () => {
    render(<Toolbar {...baseProps} />);

    // basic actions
    expect(screen.getByRole('button', { name: '筛选' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '排序' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '显示隐藏字段' })).toBeInTheDocument();

    // change row height
    const user = userEvent.setup();
    await user.click(screen.getByText('行高 ▾'));
    await user.click(screen.getByText('medium'));
    expect(baseProps.onRowHeightChange).toHaveBeenCalledWith('medium');
  });
});