import { useState, useEffect, useRef } from 'react';
import { IconPlus, IconTask, IconTable, IconMore, IconChevronDown, IconChevronRight, IconCollect, IconDashboard, IconFolder } from './Icons';
import { colors } from '../design/tokens';

type Props = {
  active: string;
  onNavigate: (key: string) => void;
  onSelectTable?: (tableId: string) => void;
  externalNewTable?: { id: string; name: string; description?: string } | null;
};

type DataTable = { id: string; name: string; description: string };
type Task = { id: string; name: string; tables: DataTable[] };
type Project = { id: string; name: string; tasks: Task[] };

const SectionTitle: React.FC<{ title: string; onAdd?: () => void; addDisabled?: boolean; addTooltip?: string }> = ({ title, onAdd, addDisabled, addTooltip }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', padding: '8px 12px', textTransform: 'uppercase' }}>
    <span>{title}</span>
    {onAdd && (
      <span
        role="button"
        title={addDisabled ? (addTooltip || '不可用') : `新建${title}`}
        onClick={() => {
          if (addDisabled) {
            window.alert(addTooltip || 'Error: prompt() is not supported.');
          } else {
            onAdd();
          }
        }}
        style={{ cursor: addDisabled ? 'not-allowed' : 'pointer', opacity: addDisabled ? 0.5 : 1, display: 'inline-flex', alignItems: 'center' }}
      >
        <IconPlus />
      </span>
    )}
  </div>
);

const Row: React.FC<{ label: React.ReactNode; active?: boolean; onClick?: () => void; trailing?: React.ReactNode }>
  = ({ label, active, onClick, trailing }) => (
  <div
    onClick={onClick}
    style={{
      padding: 'var(--spacing) 12px',
      cursor: 'pointer',
      borderRadius: 'var(--radius)',
      background: active ? 'var(--surface-accent)' : 'transparent',
      color: active ? 'var(--color-primary)' : '#202020',
      margin: '2px var(--spacing)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between'
    }}
  >
    <div style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.4 }}>{label}</div>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing)', flex: 'none' }}>{trailing}</span>
  </div>
);

const Menu: React.FC<{ items: { label: string; onClick: () => void; danger?: boolean }[] }>
  = ({ items }) => {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const cancelClose = () => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    if (!open) return;
    const calc = () => {
      const triggerEl = wrapperRef.current;
      const popEl = menuRef.current;
      if (!triggerEl || !popEl) return;
      const rect = triggerEl.getBoundingClientRect();
      const menuHeight = popEl.offsetHeight;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldFlipToTop = spaceBelow < menuHeight + 8 && spaceAbove > spaceBelow;
      setPlacement(shouldFlipToTop ? 'top' : 'bottom');
    };
    const raf = requestAnimationFrame(calc);
    window.addEventListener('resize', calc);
    window.addEventListener('scroll', calc, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', calc);
      window.removeEventListener('scroll', calc, true);
    };
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative', display: 'inline-block' }}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <span
        role="button"
        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
        onClick={() => { cancelClose(); setOpen(!open); }}
      >
        <IconMore />
      </span>
      {open && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: placement === 'bottom' ? '100%' : 'auto',
            bottom: placement === 'top' ? '100%' : 'auto',
            right: 0,
            marginTop: placement === 'bottom' ? 6 : 0,
            marginBottom: placement === 'top' ? 6 : 0,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            minWidth: 160,
            zIndex: 60
          }}
        >
          {items.map((it, idx) => (
            <div
              key={idx}
              style={{ padding: 'var(--spacing)', cursor: 'pointer', color: it.danger ? '#c00' : undefined }}
              onClick={() => { cancelClose(); it.onClick(); setOpen(false); }}
            >
              {it.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Modal: React.FC<{ open: boolean; title: string; children: React.ReactNode; onClose: () => void; onConfirm: () => void }> = ({ open, title, children, onClose, onConfirm }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: 360, boxShadow: '0 12px 48px rgba(0,0,0,0.12)' }}>
        <div style={{ padding: '12px 16px', fontWeight: 600 }}>{title}</div>
        <div style={{ padding: '0 16px 12px' }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTop: '1px solid #eee' }}>
          <button onClick={onClose} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>取消</button>
          <button onClick={onConfirm} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #1f5fff', background: '#1f5fff', color: '#fff', cursor: 'pointer' }}>确认</button>
        </div>
      </div>
    </div>
  );
};

export const Sidebar: React.FC<Props> = ({ active, onNavigate, onSelectTable, externalNewTable }) => {
  // 保留 active 参数避免未来用到，同时避免未使用参数报错
  void active;
  const [projects, setProjects] = useState<Project[]>([{
    id: 'p-1', name: '项目A', tasks: [
      { id: 't-1', name: '任务A-1', tables: [{ id: 'tbl-1', name: '数据表1', description: '示例数据表' }] }
    ]
  }]);
  // 组件状态：展开
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({ 'p-1': true });
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({ 't-1': true });
  // 当前选中的数据表ID（用于高亮与独立选中）
  const [activeTableId, setActiveTableId] = useState<string | null>('tbl-1');
  
  // 新建弹窗所需状态
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeType, setComposeType] = useState<'project' | 'task' | 'table' | 'collect' | 'dashboard' | 'folder' | null>(null);
  const [composeName, setComposeName] = useState('');
  const [composeDesc, setComposeDesc] = useState('');
  const [composeProjectId, setComposeProjectId] = useState<string | null>(null);
  const [composeTaskId, setComposeTaskId] = useState<string | null>(null);
  
  // 新增：专业栏简单条目类型
  type SimpleItem = { id: string; name: string };
  const [collects, setCollects] = useState<SimpleItem[]>([]);
  const [dashboards, setDashboards] = useState<SimpleItem[]>([]);
  const [folders, setFolders] = useState<SimpleItem[]>([]);
  const [activeProId, setActiveProId] = useState<string | null>(null);
  const openCompose = (type: 'project' | 'task' | 'table' | 'collect' | 'dashboard' | 'folder', projectId?: string, taskId?: string) => {
    setComposeOpen(true);
    setComposeType(type);
    setComposeName('');
    setComposeDesc('');
    setComposeProjectId(projectId ?? null);
    setComposeTaskId(taskId ?? null);
  };
  
  const closeCompose = () => setComposeOpen(false);
  
  const confirmCompose = () => {
    if (!composeType) return;
    const name = composeName.trim();
    if (!name) { window.alert('请输入名称'); return; }
    if (composeType === 'project') {
      setProjects(prev => [...prev, { id: `p-${prev.length + 1}-${Date.now()}`, name, tasks: [] }]);
    } else if (composeType === 'task') {
      if (!composeProjectId) { window.alert('请选择所属项目'); return; }
      setProjects(prev => prev.map(p => p.id === composeProjectId ? { ...p, tasks: [...p.tasks, { id: `t-${p.tasks.length + 1}-${Date.now()}`, name, tables: [] }] } : p));
      setExpandedProjects(e => ({ ...e, [composeProjectId]: true }));
    } else if (composeType === 'table') {
      if (!composeProjectId || !composeTaskId) { window.alert('请选择所属项目和任务'); return; }
      const description = composeDesc.trim();
      const targetTask = projects.find(p => p.id === composeProjectId)?.tasks.find(t => t.id === composeTaskId);
      const newId = `tbl-${(targetTask?.tables.length ?? 0) + 1}-${Date.now()}`;
      setProjects(prev => prev.map(p => p.id === composeProjectId ? {
        ...p,
        tasks: p.tasks.map(t => t.id === composeTaskId ? { ...t, tables: [...t.tables, { id: newId, name, description }] } : t)
      } : p));
      setExpandedProjects(e => ({ ...e, [composeProjectId]: true }));
      setExpandedTasks(e => ({ ...e, [composeTaskId]: true }));
      setActiveTableId(newId);
      onNavigate('table');
      onSelectTable?.(newId);
    } else if (composeType === 'collect') {
      const id = `collect-${collects.length + 1}-${Date.now()}`;
      setCollects(prev => [...prev, { id, name }]);
      setActiveProId(id);
      onNavigate('collect');
    } else if (composeType === 'dashboard') {
      const id = `dashboard-${dashboards.length + 1}-${Date.now()}`;
      setDashboards(prev => [...prev, { id, name }]);
      setActiveProId(id);
      onNavigate('dashboard');
    } else if (composeType === 'folder') {
      const id = `folder-${folders.length + 1}-${Date.now()}`;
      setFolders(prev => [...prev, { id, name }]);
      setActiveProId(id);
      onNavigate('files');
    }
    closeCompose();
  };
  // 已弃用的新增函数（未使用），移除以通过 noUnusedLocals 检查

  // 外部注入的新建数据表：默认追加到项目 p-1 / 任务 t-1
  useEffect(() => {
    if (!externalNewTable) return;
    const { id, name, description = '' } = externalNewTable;
    // 若已存在则忽略
    const exists = projects.some(p => p.tasks.some(t => t.tables.some(tb => tb.id === id)));
    if (exists) return;
    setProjects(prev => prev.map(p => p.id === 'p-1' ? {
      ...p,
      tasks: p.tasks.map(t => t.id === 't-1' ? { ...t, tables: [...t.tables, { id, name, description }] } : t)
    } : p));
    setExpandedProjects(e => ({ ...e, ['p-1']: true }));
    setExpandedTasks(e => ({ ...e, ['t-1']: true }));
    // 仅追加到列表，不自动切换激活表
  }, [externalNewTable]);

  const renameProject = (projectId: string) => {
    const name = (window.prompt('重命名项目') || '').trim();
    if (!name) return;
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name } : p));
  };
  const deleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const renameTask = (projectId: string, taskId: string) => {
    const name = (window.prompt('重命名任务') || '').trim();
    if (!name) return;
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, name } : t) } : p));
  };
  const deleteTask = (projectId: string, taskId: string) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) } : p));
  };

  const renameTable = (projectId: string, taskId: string, tableId: string) => {
    const name = (window.prompt('重命名数据表') || '').trim();
    if (!name) return;
    setProjects(prev => prev.map(p => p.id === projectId ? {
      ...p,
      tasks: p.tasks.map(t => t.id === taskId ? { ...t, tables: t.tables.map(tb => tb.id === tableId ? { ...tb, name } : tb) } : t)
    } : p));
  };
  const editTableDesc = (projectId: string, taskId: string, tableId: string) => {
    const desc = (window.prompt('重新描述简介') || '').trim();
    setProjects(prev => prev.map(p => p.id === projectId ? {
      ...p,
      tasks: p.tasks.map(t => t.id === taskId ? { ...t, tables: t.tables.map(tb => tb.id === tableId ? { ...tb, description: desc } : tb) } : t)
    } : p));
  };
  const duplicateTable = (projectId: string, taskId: string, tableId: string) => {
    setProjects(prev => prev.map(p => p.id === projectId ? {
      ...p,
      tasks: p.tasks.map(t => {
        if (t.id !== taskId) return t;
        const src = t.tables.find(tb => tb.id === tableId);
        if (!src) return t;
        const copy: DataTable = { id: `${tableId}-copy-${Date.now()}`, name: `${src.name} 副本`, description: src.description };
        return { ...t, tables: [...t.tables, copy] };
      })
    } : p));
    const newId = `${tableId}-copy-${Date.now()}`;
    setActiveTableId(newId);
    onNavigate('table');
    onSelectTable?.(newId);
  };

  const deleteTable = (projectId: string, taskId: string, tableId: string) => {
    setProjects(prev => prev.map(p => p.id === projectId ? {
      ...p,
      tasks: p.tasks.map(t => t.id === taskId ? { ...t, tables: t.tables.filter(tb => tb.id !== tableId) } : t)
    } : p));
    setActiveTableId(prev => (prev === tableId ? null : prev));
  };

  // 专业栏：重命名/复制/删除处理函数
  const renameCollect = (id: string) => {
    const name = (window.prompt('重命名收集表') || '').trim();
    if (!name) return;
    setCollects(prev => prev.map(it => it.id === id ? { ...it, name } : it));
  };
  const duplicateCollect = (id: string) => {
    setCollects(prev => {
      const src = prev.find(it => it.id === id);
      if (!src) return prev;
      const copy: SimpleItem = { id: `${id}-copy-${Date.now()}`, name: `${src.name} 副本` };
      return [...prev, copy];
    });
  };
  const deleteCollect = (id: string) => {
    setCollects(prev => prev.filter(it => it.id !== id));
    setActiveProId(prev => (prev === id ? null : prev));
  };

  const renameDashboard = (id: string) => {
    const name = (window.prompt('重命名仪表盘') || '').trim();
    if (!name) return;
    setDashboards(prev => prev.map(it => it.id === id ? { ...it, name } : it));
  };
  const duplicateDashboard = (id: string) => {
    setDashboards(prev => {
      const src = prev.find(it => it.id === id);
      if (!src) return prev;
      const copy: SimpleItem = { id: `${id}-copy-${Date.now()}`, name: `${src.name} 副本` };
      return [...prev, copy];
    });
  };
  const deleteDashboard = (id: string) => {
    setDashboards(prev => prev.filter(it => it.id !== id));
    setActiveProId(prev => (prev === id ? null : prev));
  };

  const renameFolder = (id: string) => {
    const name = (window.prompt('重命名文件夹') || '').trim();
    if (!name) return;
    setFolders(prev => prev.map(it => it.id === id ? { ...it, name } : it));
  };
  const duplicateFolder = (id: string) => {
    setFolders(prev => {
      const src = prev.find(it => it.id === id);
      if (!src) return prev;
      const copy: SimpleItem = { id: `${id}-copy-${Date.now()}`, name: `${src.name} 副本` };
      return [...prev, copy];
    });
  };
  const deleteFolder = (id: string) => {
    setFolders(prev => prev.filter(it => it.id !== id));
    setActiveProId(prev => (prev === id ? null : prev));
  };

  const toggleProject = (projectId: string) => setExpandedProjects(e => ({ ...e, [projectId]: !e[projectId] }));
  const toggleTask = (taskId: string) => setExpandedTasks(e => ({ ...e, [taskId]: !e[taskId] }));

  // 在 Sidebar 组件内部已有状态与函数后，渲染最底部增加 Modal UI（依赖 compose* 状态）
  return (
    <div style={{ width: 260, minWidth: 260, maxWidth: 260, boxSizing: 'border-box', flex: '0 0 260px', borderRight: `1px solid ${colors.dividerSubtle}`, minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      <div style={{ padding: 12, fontWeight: 700 }}>多维表格</div>
  
      {/* 项目层级 */}
      <SectionTitle title="项目" />
      <div>
        {projects.map((p) => (
          <div key={p.id}>
            <Row
              label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{expandedProjects[p.id] ? <IconChevronDown /> : <IconChevronRight />}<span>{p.name}</span></span>}
              active={false}
              onClick={() => toggleProject(p.id)}
              trailing={(
                <>
                  <span role="button" title="新建任务" onClick={(e) => { e.stopPropagation(); openCompose('task', p.id); }} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}><IconTask /></span>
                  <Menu items={[
                    { label: '重命名', onClick: () => renameProject(p.id) },
                    ...(p.id !== 'p-1' ? [{ label: '删除', onClick: () => deleteProject(p.id), danger: true }] : []),
                  ]} />
                </>
              )}
            />
            {expandedProjects[p.id] && (
              <div style={{ marginLeft: 16 }}>
                {p.tasks.map((t) => (
                  <div key={t.id}>
                    <Row
                      label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{expandedTasks[t.id] ? <IconChevronDown /> : <IconChevronRight />}<span>{t.name}</span></span>}
                      onClick={() => toggleTask(t.id)}
                      trailing={(
                        <>
                          <span role="button" title="新建数据表" onClick={(e) => { e.stopPropagation(); openCompose('table', p.id, t.id); }} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}><IconTable /></span>
                          <Menu items={[
                            { label: '重命名', onClick: () => renameTask(p.id, t.id) },
                            ...(p.id === 'p-1' && t.id === 't-1' ? [] : [{ label: '删除', onClick: () => deleteTask(p.id, t.id), danger: true }]),
                          ]} />
                        </>
                      )}
                    />
                    {expandedTasks[t.id] && (
                      <div style={{ marginLeft: 16 }}>
                        {t.tables.map((tb) => (
                          <Row
                            key={tb.id}
                            label={tb.name}
                            active={activeTableId === tb.id}
                            onClick={() => { setActiveTableId(tb.id); onNavigate('table'); onSelectTable?.(tb.id); }}
                            trailing={(
                              <>
                                <Menu items={[
                                  { label: '重命名', onClick: () => renameTable(p.id, t.id, tb.id) },
                                  { label: '重新描述简介', onClick: () => editTableDesc(p.id, t.id, tb.id) },
                                  { label: '复制', onClick: () => duplicateTable(p.id, t.id, tb.id) },
                                  ...(p.id === 'p-1' && t.id === 't-1' && tb.id === 'tbl-1' ? [] : [{ label: '删除', onClick: () => deleteTable(p.id, t.id, tb.id), danger: true }]),
                                ]} />
                              </>
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
  
      <div style={{ borderTop: '1px solid #eee', margin: '8px 0' }} />
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#8a8a8a', padding: '8px 12px', textTransform: 'uppercase' }}>
    <span>专业</span>
  </div>
  <div>
    {collects.map(it => (
      <Row
        key={it.id}
        label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconCollect />{it.name}</span>}
        active={activeProId === it.id}
        onClick={() => { setActiveProId(it.id); onNavigate('collect'); }}
        trailing={(
          <Menu items={[
            { label: '重命名', onClick: () => renameCollect(it.id) },
            { label: '复制', onClick: () => duplicateCollect(it.id) },
            { label: '删除', onClick: () => deleteCollect(it.id), danger: true },
          ]} />
        )}
      />
    ))}
    {dashboards.map(it => (
      <Row
        key={it.id}
        label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconDashboard />{it.name}</span>}
        active={activeProId === it.id}
        onClick={() => { setActiveProId(it.id); onNavigate('dashboard'); }}
        trailing={(
          <Menu items={[
            { label: '重命名', onClick: () => renameDashboard(it.id) },
            { label: '复制', onClick: () => duplicateDashboard(it.id) },
            { label: '删除', onClick: () => deleteDashboard(it.id), danger: true },
          ]} />
        )}
      />
    ))}
    {folders.map(it => (
      <Row
        key={it.id}
        label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconFolder />{it.name}</span>}
        active={activeProId === it.id}
        onClick={() => { setActiveProId(it.id); onNavigate('files'); }}
        trailing={(
          <Menu items={[
            { label: '重命名', onClick: () => renameFolder(it.id) },
            { label: '复制', onClick: () => duplicateFolder(it.id) },
            { label: '删除', onClick: () => deleteFolder(it.id), danger: true },
          ]} />
        )}
      />
    ))}
  </div>
  <div style={{ borderTop: '1px solid #eee', margin: '8px 0' }} />
  <SectionTitle title="视图" />
  <div>
    <Row
      label={<span>查询页</span>}
      active={active === 'query'}
      onClick={() => { onNavigate('query'); }}
    />
    <Row
      label={<span>看板</span>}
      active={active === 'kanban'}
      onClick={() => { onNavigate('kanban'); }}
    />
    <Row
      label={<span>日历</span>}
      active={active === 'calendar'}
      onClick={() => { onNavigate('calendar'); }}
    />
  </div>
  <div style={{ borderTop: '1px solid #eee', margin: '8px 0' }} />
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#8a8a8a', padding: '8px 12px', textTransform: 'uppercase' }}>
    <span>新增</span>
  </div>
  <div style={{ padding: '4px 0' }}>
    <Row label={<span>新建项目</span>} onClick={() => openCompose('project')} />
    <Row label={<span>新建任务</span>} onClick={() => openCompose('task')} />
    <Row label={<span>新建数据表</span>} onClick={() => openCompose('table')} />
    <Row label={<span>新建收集表</span>} onClick={() => openCompose('collect')} />
    <Row label={<span>新建仪表盘</span>} onClick={() => openCompose('dashboard')} />
    <Row label={<span>新建文件夹</span>} onClick={() => openCompose('folder')} />
  </div>
    
    <div style={{ marginTop: 'auto', padding: 12, fontSize: 12, color: '#8a8a8a' }}>HugoXu · 技术支持</div>
    <Modal
      open={composeOpen}
      title={composeType === 'project' ? '新建项目' : composeType === 'task' ? '新建任务' : composeType === 'table' ? '新建数据表' : composeType === 'collect' ? '新建收集表' : composeType === 'dashboard' ? '新建仪表盘' : composeType === 'folder' ? '新建文件夹' : ''}
      onClose={closeCompose}
      onConfirm={confirmCompose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span>名称</span>
          <input value={composeName} onChange={(e) => setComposeName(e.target.value)} style={{ padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid #ddd' }} />
        </label>
        {composeType === 'task' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>所属项目</span>
            <select
              value={composeProjectId ?? ''}
              onChange={(e) => { const v = e.target.value || null; setComposeProjectId(v); }}
              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' }}
            >
              <option value="">请选择项目</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        )}
        {composeType === 'table' && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>所属项目</span>
              <select
                value={composeProjectId ?? ''}
                onChange={(e) => { const v = e.target.value || null; setComposeProjectId(v); setComposeTaskId(null); }}
                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' }}
              >
                <option value="">请选择项目</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>所属任务</span>
              <select
                value={composeTaskId ?? ''}
                onChange={(e) => { const v = e.target.value || null; setComposeTaskId(v); }}
                disabled={!composeProjectId}
                style={{ padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid #ddd' }}
              >
                <option value="">请选择任务</option>
                {(projects.find(p => p.id === composeProjectId)?.tasks || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          </>
        )}
        {composeType === 'table' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>简介</span>
            <textarea value={composeDesc} onChange={(e) => setComposeDesc(e.target.value)} rows={3} style={{ padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid #ddd', resize: 'vertical' }} />
          </label>
        )}
      </div>
    </Modal>
  </div>
);
};

export default Sidebar;

;