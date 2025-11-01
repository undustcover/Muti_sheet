import { useState, useEffect, useRef } from 'react';
import { IconPlus, IconTask, IconTable, IconMore, IconChevronDown, IconChevronRight, IconCollect, IconDashboard, IconFolder } from './Icons';
import { apiCreateProject } from '../services/projects';
import { apiCreateTable, apiListTables, apiDeleteTable } from '../services/tables';
import { apiDeleteTask } from '../services/tasks';
import { apiDeleteProject } from '../services/projects';
import { apiCreateTask, apiListTasks } from '../services/tasks';
import { notifySpaceChanged, apiListMySpace } from '../services/space';
import { colors } from '../design/tokens';
import { useToast } from './Toast';

type Props = {
  active: string;
  onNavigate: (key: string) => void;
  onSelectTable?: (tableId: string) => void;
  externalNewTable?: { id: string; name: string; description?: string } | null;
  onSelectSpaceNode?: (scope: 'my' | 'public', level: 'project' | 'task' | 'table', id: string) => void;
};

type DataTable = { id: string; name: string; description: string; projectId?: string };
type Task = { id: string; name: string; tables: DataTable[] };
type Project = { id: string; name: string; tasks: Task[]; source?: 'local' | 'server' };

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

// 已移除与主页空间相关的服务引用

export const Sidebar: React.FC<Props> = ({ active, onNavigate, onSelectTable, externalNewTable, onSelectSpaceNode }) => {
  // 保留 active 参数避免未来用到，同时避免未使用参数报错
  void active;
  const { show } = useToast();
  // 项目/任务/表树（从后端加载）
  const [projects, setProjects] = useState<Project[]>([]);
  // 从后端“我的空间”加载的项目列表（仅用于下拉选择）
  const [myProjects, setMyProjects] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await apiListMySpace();
        if (!mounted) return;
        setMyProjects(list.map(p => ({ id: p.id, name: p.name })));
      } catch (err: any) {
        console.warn('加载我的空间项目失败：', err);
        const msg = err?.message || '';
        if (msg.includes('未登录')) {
          show('登录状态失效，已跳转到登录页面', 'warning');
        } else {
          show('加载我的空间项目失败', 'info');
        }
      }
    })();
    return () => { mounted = false; };
  }, [show]);
  // 组件状态：展开
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  // 当前选中的数据表ID（用于高亮与独立选中）
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  
  // 新建弹窗所需状态
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeType, setComposeType] = useState<'project' | 'task' | 'table' | 'collect' | 'dashboard' | 'folder' | null>(null);
  const [composeName, setComposeName] = useState('');
  const [composeDesc, setComposeDesc] = useState('');
  const [composeProjectId, setComposeProjectId] = useState<string | null>(null);
  const [composeTaskId, setComposeTaskId] = useState<string | null>(null);
  const [composeTaskOptions, setComposeTaskOptions] = useState<Array<{ id: string; name: string }>>([]);
  
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
    if (type === 'table' && projectId) {
      (async () => {
        try {
          // 先从本地树获取任务，后合并远端结果
          const prj = projects.find(p => p.id === projectId);
          const localTasks = (prj?.tasks || []).filter(t => !String(t.id).includes('::uncategorized')).map(t => ({ id: t.id, name: t.name }));
          setComposeTaskOptions(localTasks);
          const tasks = await apiListTasks(projectId);
          const mergedMap = new Map<string, { id: string; name: string }>();
          [...localTasks, ...tasks].forEach(t => mergedMap.set(t.id, t));
          setComposeTaskOptions(Array.from(mergedMap.values()));
        } catch (err) {
          console.warn('加载项目任务失败：', err);
          // 保留本地列表作为兜底
          const prj = projects.find(p => p.id === projectId);
          const localTasks = (prj?.tasks || []).filter(t => !String(t.id).includes('::uncategorized')).map(t => ({ id: t.id, name: t.name }));
          setComposeTaskOptions(localTasks);
        }
      })();
    } else {
      setComposeTaskOptions([]);
    }
  };

  // 加载我的空间（项目→任务→数据表）并映射到本组件树结构
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await apiListMySpace();
        if (cancelled) return;
        const mapped: Project[] = list.map(p => {
          const tasks = Array.isArray(p.tasks) ? p.tasks.map(t => ({
            id: t.id,
            name: t.name,
            tables: Array.isArray(t.tables) ? t.tables.map(tb => ({ id: tb.id, name: tb.name, description: '', projectId: (tb as any).projectId })) : [],
          })) : [];
          // 若存在顶层未归属任务的表，则归入“未归属任务”分组
          const topTables = Array.isArray(p.tables) ? p.tables : [];
          const withUncat = topTables.length > 0 ? tasks.concat([{ id: `${p.id}::uncategorized`, name: '未归属任务', tables: topTables.map(tb => ({ id: tb.id, name: tb.name, description: '', projectId: (tb as any).projectId })) }]) : tasks;
          return { id: p.id, name: p.name, tasks: withUncat, source: 'server' };
        });
        setProjects(mapped);
        // 默认展开首个项目/任务，便于用户发现层级
        if (mapped[0]) {
          setExpandedProjects(e => ({ ...e, [mapped[0].id]: true }));
          const firstTask = mapped[0].tasks[0];
          if (firstTask) setExpandedTasks(e => ({ ...e, [firstTask.id]: true }));
        }
        // 首次登录：若空间为空，自动创建默认项目/任务/数据表
        // 避免重复触发，使用 ref 标记
        defaultsInitRef.current ||= false;
        if (!defaultsInitRef.current && mapped.length === 0) {
          defaultsInitRef.current = true;
          try {
            const prj = await apiCreateProject('默认项目');
            setProjects(prev => [...prev, { id: prj.id, name: prj.name, tasks: [], source: 'server' }]);
            setMyProjects(prev => [...prev, { id: prj.id, name: prj.name }]);
            const task = await apiCreateTask(prj.id, '默认任务');
            setProjects(prev => prev.map(p => p.id === prj.id ? { ...p, tasks: [...p.tasks, { id: task.id, name: task.name, tables: [] }] } : p));
            const table = await apiCreateTable(prj.id, '默认数据表', undefined, task.id);
            setProjects(prev => prev.map(p => p.id === prj.id ? {
              ...p,
              tasks: p.tasks.map(t => t.id === task.id ? { ...t, tables: [...t.tables, { id: table.id, name: table.name, description: '', projectId: prj.id }] } : t)
            } : p));
            setExpandedProjects(e => ({ ...e, [prj.id]: true }));
            setExpandedTasks(e => ({ ...e, [task.id]: true }));
            notifySpaceChanged();
            show('已为您创建默认项目/任务/数据表', 'success');
          } catch (e) {
            console.warn('默认资源创建失败：', e);
          }
        }
      } catch (err: any) {
        console.warn('加载侧边栏空间失败：', err);
        const msg = err?.message || '';
        if (msg.includes('未登录')) {
          show('登录状态失效，已跳转到登录页面', 'warning');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [show]);
  
  const closeCompose = () => setComposeOpen(false);
  
  const confirmCompose = async () => {
    if (!composeType) return;
    const name = composeName.trim();
    if (!name) { window.alert('请输入名称'); return; }
    if (composeType === 'project') {
      try {
        const created = await apiCreateProject(name);
        setProjects(prev => [...prev, { id: created.id, name: created.name, tasks: [], source: 'server' }]);
        // 立刻同步到“我的项目”下拉，避免需要返回主页刷新
        setMyProjects(prev => {
          const exists = prev.some(p => p.id === created.id);
          return exists ? prev : [...prev, { id: created.id, name: created.name }];
        });
        notifySpaceChanged();
        show('项目已创建并持久化', 'success');
      } catch (err: any) {
        console.warn('后端创建项目失败：', err);
        const msg = err?.message || '';
        show(msg || '创建项目失败', 'error');
        return;
      }
    } else if (composeType === 'task') {
      if (!composeProjectId) { window.alert('请选择所属项目'); return; }
      const inMy = myProjects.find(p => p.id === composeProjectId);
      if (!inMy) { show('请选择后端项目进行创建', 'warning'); return; }
      try {
        const t = await apiCreateTask(composeProjectId, name, composeDesc.trim() || undefined);
        // 将新任务添加到本地侧边栏树（若本地无该项目则补一个占位）
        setProjects(prev => {
          const exists = prev.find(p => p.id === composeProjectId);
          if (!exists) {
            return [...prev, { id: composeProjectId, name: inMy.name, tasks: [{ id: t.id, name: t.name, tables: [] }], source: 'server' }];
          }
          return prev.map(p => p.id === composeProjectId ? { ...p, tasks: [...p.tasks, { id: t.id, name: t.name, tables: [] }] } : p);
        });
        setExpandedProjects(e => ({ ...e, [composeProjectId]: true }));
        setExpandedTasks(e => ({ ...e, [t.id]: true }));
        notifySpaceChanged();
        show('任务已创建并持久化', 'success');
      } catch (err: any) {
        console.warn('创建任务失败：', err);
        const msg = err?.message || '';
        if (msg.includes('未登录')) {
          show('登录状态失效，已跳转到登录页面', 'warning');
        } else {
          show(msg || '创建任务失败', 'error');
        }
        return;
      }
    } else if (composeType === 'table') {
      if (!composeProjectId) { window.alert('请选择所属项目'); return; }
      const inMy = myProjects.find(p => p.id === composeProjectId);
      if (!inMy) { show('请选择后端项目进行创建', 'warning'); return; }
      if (!composeTaskId) { window.alert('请选择所属任务'); return; }
      try {
        const tb = await apiCreateTable(composeProjectId, name, undefined, composeTaskId);
        // 将新表追加到本地侧边栏树，避免需要返回主页
        setProjects(prev => prev.map(p => p.id === composeProjectId ? {
          ...p,
          tasks: p.tasks.map(t => t.id === composeTaskId ? { ...t, tables: [...t.tables, { id: tb.id, name: tb.name, description: '', projectId: composeProjectId }] } : t)
        } : p));
        setExpandedProjects(e => ({ ...e, [composeProjectId]: true }));
        setExpandedTasks(e => ({ ...e, [composeTaskId]: true }));
        setActiveTableId(tb.id);
        onNavigate('table');
        onSelectTable?.(tb.id);
        notifySpaceChanged();
        try { await apiListTables(composeProjectId); } catch {}
        show('数据表已创建并加入当前任务', 'success');
      } catch (err: any) {
        console.warn('保存新建数据表到后端失败：', err);
        const msg = err?.message || '';
        if (msg.includes('未登录')) {
          show('登录状态失效，已跳转到登录页面', 'warning');
        } else {
          show(msg || '保存新建数据表失败', 'error');
        }
        return;
      }
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
  const deleteProject = async (projectId: string) => {
    const ok1 = window.confirm('确定要删除该项目吗？此操作不可撤销。');
    if (!ok1) return;
    const ok2 = window.confirm('删除将同时移除项目下的所有任务与数据表，是否继续？');
    if (!ok2) return;
    try {
      await apiDeleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      // 同步移除“我的项目”下拉中的已删除项目，避免在新建任务时仍可选到
      setMyProjects(prev => prev.filter(p => p.id !== projectId));
      setActiveTableId(null);
      show('项目已删除并持久化', 'success');
      notifySpaceChanged();
    } catch (err: any) {
      const msg = err?.message || '删除项目失败';
      if (msg.includes('未登录')) {
        show('登录状态失效，已跳转到登录页面', 'warning');
      } else {
        show(msg, 'error');
      }
    }
  };

  const renameTask = (projectId: string, taskId: string) => {
    const name = (window.prompt('重命名任务') || '').trim();
    if (!name) return;
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, name } : t) } : p));
  };
  const deleteTask = async (projectId: string, taskId: string) => {
    const ok1 = window.confirm('确定要删除该任务吗？此操作不可撤销。');
    if (!ok1) return;
    const ok2 = window.confirm('删除将同时移除任务下的所有数据表，是否继续？');
    if (!ok2) return;
    try {
      await apiDeleteTask(projectId, taskId);
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) } : p));
      setActiveTableId(prev => {
        const stillExists = projects.some(p => p.id === projectId && p.tasks.some(t => t.id !== taskId && t.tables.some(tb => tb.id === prev)));
        return stillExists ? prev : null;
      });
      show('任务已删除并持久化', 'success');
      notifySpaceChanged();
    } catch (err: any) {
      const msg = err?.message || '删除任务失败';
      if (msg.includes('未登录')) {
        show('登录状态失效，已跳转到登录页面', 'warning');
      } else {
        show(msg, 'error');
      }
    }
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

  const deleteTable = async (projectId: string, taskId: string, tableId: string) => {
    const ok1 = window.confirm('确定要删除该数据表吗？此操作不可撤销。');
    if (!ok1) return;
    const ok2 = window.confirm('删除将清理其视图/字段/记录/附件，是否继续？');
    if (!ok2) return;
    try {
      await apiDeleteTable(projectId, tableId);
      setProjects(prev => prev.map(p => p.id === projectId ? {
        ...p,
        tasks: p.tasks.map(t => t.id === taskId ? { ...t, tables: t.tables.filter(tb => tb.id !== tableId) } : t)
      } : p));
      setActiveTableId(prev => (prev === tableId ? null : prev));
      show('数据表已删除并持久化', 'success');
      notifySpaceChanged();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('未登录')) {
        show('登录状态失效，已跳转到登录页面', 'warning');
      } else if (msg.includes('后端未提供删除表接口')) {
        show('后端暂不支持删除表，请更新后端或联系管理员', 'error');
      } else {
        show(msg || '删除数据表失败', 'error');
      }
    }
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
      <div style={{ padding: 12, fontWeight: 700 }}>川庆国际项目运营多维数据表格</div>
      {/* 移除：主页/我的空间/项目空间/文件管理区块，改由 /home 页面承载 */}

      {/* 项目层级（后端数据） */}
      <SectionTitle title="我的项目" />
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
                                  ...(p.id === 'p-1' && t.id === 't-1' && tb.id === 'tbl-1' ? [] : [{ label: '删除', onClick: () => deleteTable(tb.projectId ?? p.id, t.id, tb.id), danger: true }]),
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
    <Row label={<span>返回我的空间</span>} onClick={() => onNavigate('home')} />
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
              {myProjects.map(p => <option key={`srv-${p.id}`} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        )}
        {composeType === 'table' && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>所属项目</span>
              <select
                value={composeProjectId ?? ''}
                onChange={async (e) => {
                  const v = e.target.value || null;
                  setComposeProjectId(v);
                  setComposeTaskId(null);
                  // 先用本地侧边栏树中的任务列表，确保刚创建的任务也可立即选择
                  if (v) {
                    const localTasks = (() => {
                      const prj = projects.find(p => p.id === v);
                      const list = prj?.tasks || [];
                      // 过滤“未归属任务”分组
                      return list.filter(t => !String(t.id).includes('::uncategorized')).map(t => ({ id: t.id, name: t.name }));
                    })();
                    setComposeTaskOptions(localTasks);
                    // 再异步从后端拉取最新任务并合并去重
                    try {
                      const remote = await apiListTasks(v);
                      const mergedMap = new Map<string, { id: string; name: string }>();
                      [...localTasks, ...remote].forEach(t => mergedMap.set(t.id, t));
                      setComposeTaskOptions(Array.from(mergedMap.values()));
                    } catch (err) {
                      console.warn('加载项目任务失败：', err);
                      // 保留本地任务列表作为兜底
                      setComposeTaskOptions(localTasks);
                    }
                  } else {
                    setComposeTaskOptions([]);
                  }
                }}
                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' }}
              >
                <option value="">请选择项目</option>
                {myProjects.map(p => <option key={`srv-${p.id}`} value={p.id}>{p.name}</option>)}
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
                {composeTaskOptions.map(t => <option key={`task-${t.id}`} value={t.id}>{t.name}</option>)}
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