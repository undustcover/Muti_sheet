import type { EditorType } from './types';
import type { SelectOption } from '../../types';
import TextEditor from './TextEditor';
import NumberEditor from './NumberEditor';
import DateEditor from './DateEditor';
import SingleSelectEditor from './SingleSelectEditor';
import MultiSelectEditor from './MultiSelectEditor';
import UserEditor from './UserEditor';

export default function CellEditor({ value, onChange, type, options }: {
  value: any;
  onChange: (v: any) => void;
  type: EditorType;
  options?: SelectOption[];
}) {
  if (type === 'text') {
    return <TextEditor value={value ?? ''} onChange={onChange} />;
  }
  if (type === 'number') {
    return <NumberEditor value={value ?? 0} onChange={onChange} />;
  }
  if (type === 'date') {
    return <DateEditor value={value ?? null} onChange={onChange} />;
  }
  if (type === 'select') {
    return <SingleSelectEditor value={value ?? null} onChange={onChange} options={options} />;
  }
  if (type === 'multiSelect') {
    return <MultiSelectEditor value={value ?? []} onChange={onChange} options={options} />;
  }
  if (type === 'relation') {
    return <TextEditor value={value ?? ''} onChange={onChange} />;
  }
  if (type === 'user') {
    return <UserEditor value={value ? { id: value.id, label: value.name } : null} onChange={onChange} options={options} />;
  }
  return <span />;
}