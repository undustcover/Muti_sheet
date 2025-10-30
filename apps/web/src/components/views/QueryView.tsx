import React from 'react';
import DataTable from '../DataTable';

export default function QueryView(props: any) {
  return (
    <div style={{ display: 'grid' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
        <h3 style={{ margin: 0 }}>查询页</h3>
        <p style={{ margin: '6px 0 0', color: '#666' }}>使用顶部工具栏打开查询条件，或直接在表内筛选。</p>
      </div>
      <DataTable {...props} />
    </div>
  );
}