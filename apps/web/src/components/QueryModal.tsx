import React from 'react'

type Props = {
  open: boolean;
  onClose: () => void;
  value: string;
  onApply: (q: string) => void;
  focusTick?: number;
}

const QueryModal: React.FC<Props> = ({ open, onClose, value, onApply, focusTick }) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [open, focusTick]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 100 }} onClick={onClose}>
      <div style={{ position: 'absolute', left: '50%', top: '20%', transform: 'translateX(-50%)', background: '#fff', border: '1px solid #ddd', borderRadius: 'var(--radius)', padding: '16px', width: 440 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>查询</div>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onApply(e.target.value)}
          placeholder="精确查询词（Enter 应用）"
          onKeyDown={(e) => { if (e.key === 'Enter') { onApply((e.target as HTMLInputElement).value); onClose(); } }}
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: 6, marginBottom: 12 }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => { onApply(''); }}>清空</button>
          <button onClick={() => onClose()}>关闭</button>
        </div>
      </div>
    </div>
  );
}

export default QueryModal