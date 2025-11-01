import { useEffect, useState } from 'react';
import { useToast } from '../components/Toast';
import HomeSidebar from './HomeSidebar';
import { navigateTo } from '../router';

type Props = {
  onOpenTable: (tableId?: string) => void;
};

type TableItem = { id: string; name: string; description?: string; projectId?: string; taskId?: string };
type ProjectItem = { id: string; name: string; tasks?: Array<{ id: string; name: string; tables?: TableItem[] }>; tables?: TableItem[] };

type Selection =
  | { type: 'home' }
  | { type: 'my-project'; projectId: string }
  | { type: 'my-task'; projectId: string; taskId: string }
  | { type: 'public-project'; projectId: string }
  | { type: 'public-task'; projectId: string; taskId: string }
  | { type: 'files' };

export default function HomePage({ onOpenTable }: Props) {
  const { show } = useToast();
  const [recentTables, setRecentTables] = useState<TableItem[]>([]);
  const [spaceMy, setSpaceMy] = useState<ProjectItem[]>([]);
  const [spacePublic, setSpacePublic] = useState<ProjectItem[]>([]);
  const [selection, setSelection] = useState<Selection>({ type: 'home' });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [{ apiListRecentTables }, { apiListMySpace, apiListPublicSpace }] = await Promise.all([
          import('../services/home'),
          import('../services/space'),
        ]);
        const recent = await apiListRecentTables().catch(() => []);
        const my = await apiListMySpace();
        const pub = await apiListPublicSpace();
        if (cancelled) return;
        const rts = recent.map(it => ({ id: it.id, name: it.name, description: it.description }));
        const mySpace = my.map(p => ({ id: p.id, name: p.name, tasks: p.tasks || [], tables: p.tables || [] }));
        const pubSpace = pub.map(p => ({ id: p.id, name: p.name, tasks: p.tasks || [], tables: p.tables || [] }));
        // 若为空，提供与表格初始化对齐的默认示例
        const defaultRecent = rts.length > 0 ? rts : [{ id: 'tbl-1', name: '数据表1', description: '示例数据表' }];
        const defaultMy = mySpace.length > 0 ? mySpace : [{ id: 'proj-a', name: '项目A', tables: [{ id: 'tbl-1', name: '数据表1' }] }];
        const defaultPub = pubSpace.length > 0 ? pubSpace : [];
        setRecentTables(defaultRecent);
        setSpaceMy(defaultMy);
        setSpacePublic(defaultPub);
        // 根据 URL 查询参数设置初始选中
        const params = new URLSearchParams(window.location.search);
        const pid = params.get('projectId');
        const tid = params.get('taskId');
        if (pid) {
          const inMy = defaultMy.find(p => p.id === pid);
          const inPub = defaultPub.find(p => p.id === pid);
          if (tid && inMy) setSelection({ type: 'my-task', projectId: pid, taskId: tid });
          else if (tid && inPub) setSelection({ type: 'public-task', projectId: pid, taskId: tid });
          else if (inMy) setSelection({ type: 'my-project', projectId: pid });
          else if (inPub) setSelection({ type: 'public-project', projectId: pid });
        }
      } catch (err: any) {
        console.error(err);
        const msg = err?.message || '';
        // 未登录时：直接跳转登录页（服务内已触发登出与导航），此处仅提示
        show(msg.includes('未登录') ? '未登录或登录过期，已跳转到登录页面' : '主页数据加载失败', msg.includes('未登录') ? 'warning' : 'info');
        // 不再展示示例数据或继续显示空间内容
      }
    };
    load();
    return () => { cancelled = true; };
  }, [show]);

  // 监听空间变化事件（如侧边栏新建项目/任务/表），自动刷新空间数据
  useEffect(() => {
    const handler = () => {
      (async () => {
        try {
          const [{ apiListMySpace, apiListPublicSpace }] = await Promise.all([
            import('../services/space'),
          ]);
          const my = await apiListMySpace();
          const pub = await apiListPublicSpace();
          setSpaceMy(my.map(p => ({ id: p.id, name: p.name, tasks: p.tasks || [], tables: p.tables || [] })));
          setSpacePublic(pub.map(p => ({ id: p.id, name: p.name, tasks: p.tasks || [], tables: p.tables || [] })));
        } catch (err: any) {
          console.warn('刷新空间数据失败：', err);
          const msg = err?.message || '';
          if (msg.includes('未登录')) {
            show('登录状态失效，已跳转到登录页面', 'warning');
            navigateTo('/');
          }
        }
      })();
    };
    window.addEventListener('space:changed', handler);
    return () => window.removeEventListener('space:changed', handler);
  }, []);

  // 根据选择更新 URL 查询参数，便于分享或回到之前选择
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selection.type === 'my-project' || selection.type === 'public-project') {
      params.set('projectId', selection.projectId);
      params.delete('taskId');
    } else if (selection.type === 'my-task' || selection.type === 'public-task') {
      params.set('projectId', selection.projectId);
      params.set('taskId', selection.taskId);
    } else {
      params.delete('projectId');
      params.delete('taskId');
    }
    const qs = params.toString();
    navigateTo(qs ? `/home?${qs}` : '/home');
  }, [selection]);

  // 监听浏览器返回/前进，依据查询参数还原选择
  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const pid = params.get('projectId');
      const tid = params.get('taskId');
      if (!pid) { setSelection({ type: 'home' }); return; }
      const inMy = spaceMy.find(p => p.id === pid);
      const inPub = spacePublic.find(p => p.id === pid);
      if (tid && inMy) setSelection({ type: 'my-task', projectId: pid, taskId: tid });
      else if (tid && inPub) setSelection({ type: 'public-task', projectId: pid, taskId: tid });
      else if (inMy) setSelection({ type: 'my-project', projectId: pid });
      else if (inPub) setSelection({ type: 'public-project', projectId: pid });
      else setSelection({ type: 'home' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [spaceMy, spacePublic]);

  const computeTablesForSelection = (): TableItem[] => {
    switch (selection.type) {
      case 'home':
        return recentTables;
      case 'my-project': {
        const p = spaceMy.find(x => x.id === selection.projectId);
        if (!p) return [];
        const fromTasks = (p.tasks || []).flatMap(t => t.tables || []);
        return fromTasks.length > 0 ? fromTasks : (p.tables || []);
      }
      case 'my-task': {
        const p = spaceMy.find(x => x.id === selection.projectId);
        const t = (p?.tasks || []).find(tt => tt.id === selection.taskId);
        return t?.tables || [];
      }
      case 'public-project': {
        const p = spacePublic.find(x => x.id === selection.projectId);
        if (!p) return [];
        const fromTasks = (p.tasks || []).flatMap(t => t.tables || []);
        return fromTasks.length > 0 ? fromTasks : (p.tables || []);
      }
      case 'public-task': {
        const p = spacePublic.find(x => x.id === selection.projectId);
        const t = (p?.tasks || []).find(tt => tt.id === selection.taskId);
        return t?.tables || [];
      }
      case 'files':
        return [];
      default:
        return [];
    }
  };

  const renderHeader = () => {
    switch (selection.type) {
      case 'home':
        return '最近编辑';
      case 'my-project':
        return `我的空间 · 项目`;
      case 'my-task':
        return `我的空间 · 任务`;
      case 'public-project':
        return `项目空间 · 项目`;
      case 'public-task':
        return `项目空间 · 任务`;
      case 'files':
        return '文件管理';
      default:
        return '';
    }
  };

  const tables = computeTablesForSelection();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f7f9' }}>
      <HomeSidebar
        mySpace={spaceMy}
        publicSpace={spacePublic}
        onSelectHome={() => setSelection({ type: 'home' })}
        onSelectMyProject={(projectId) => setSelection({ type: 'my-project', projectId })}
        onSelectMyTask={(projectId, taskId) => setSelection({ type: 'my-task', projectId, taskId })}
        onSelectMyTable={(tableId) => onOpenTable(tableId)}
        onSelectPublicProject={(projectId) => setSelection({ type: 'public-project', projectId })}
        onSelectPublicTask={(projectId, taskId) => setSelection({ type: 'public-task', projectId, taskId })}
        onSelectPublicTable={(tableId) => onOpenTable(tableId)}
        onSelectFiles={() => setSelection({ type: 'files' })}
      />
      <div style={{ flex: 1 }}>
        <div style={{ padding: 16 }}>
          <h2 style={{ margin: '8px 0 12px' }}>{renderHeader()}</h2>
          {selection.type === 'files' ? (
            <p style={{ color: '#666' }}>文件管理与预览入口（待接入）。</p>
          ) : (
            <>
              {tables.length === 0 && <div style={{ color: '#666' }}>暂无数据</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {tables.map(tb => (
                  <div key={tb.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, background: '#fff', cursor: 'pointer' }}
                    onClick={() => onOpenTable(tb.id)}>
                    <div style={{ fontWeight: 600 }}>{tb.name}</div>
                    {tb.description && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{tb.description}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}