import { useState } from 'react';
import { IconChevronDown, IconChevronRight } from '../components/Icons';

type TableItem = { id: string; name: string; description?: string; projectId?: string; taskId?: string };
type TaskItem = { id: string; name: string; tables?: TableItem[] };
type ProjectItem = { id: string; name: string; tasks?: TaskItem[]; tables?: TableItem[] };

type Props = {
  mySpace: ProjectItem[];
  publicSpace: ProjectItem[];
  onSelectHome: () => void;
  onSelectMyProject: (projectId: string) => void;
  onSelectMyTask: (projectId: string, taskId: string) => void;
  onSelectMyTable: (tableId: string) => void;
  onSelectPublicProject: (projectId: string) => void;
  onSelectPublicTask: (projectId: string, taskId: string) => void;
  onSelectPublicTable: (tableId: string) => void;
  onSelectFiles: () => void;
  isAdmin?: boolean;
  onSelectAdmin?: () => void;
};

const SectionTitle: React.FC<{ title: string }>
  = ({ title }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#8a8a8a', padding: '8px 12px', textTransform: 'uppercase' }}>
      <span>{title}</span>
    </div>
  );

const Row: React.FC<{ label: React.ReactNode; onClick?: () => void; active?: boolean }>
  = ({ label, onClick, active }) => (
    <div
      onClick={onClick}
      style={{ padding: '6px 12px', cursor: 'pointer', borderRadius: 6, margin: '2px 6px', background: active ? '#eef3ff' : 'transparent' }}
    >
      {label}
    </div>
  );

export default function HomeSidebar(props: Props) {
  const {
    mySpace,
    publicSpace,
    onSelectHome,
    onSelectMyProject,
    onSelectMyTask,
    onSelectMyTable,
    onSelectPublicProject,
    onSelectPublicTask,
    onSelectPublicTable,
    onSelectFiles,
    isAdmin,
    onSelectAdmin,
  } = props;

  const [expandedMyProjects, setExpandedMyProjects] = useState<Record<string, boolean>>({});
  const [expandedMyTasks, setExpandedMyTasks] = useState<Record<string, boolean>>({});
  const [expandedPublicProjects, setExpandedPublicProjects] = useState<Record<string, boolean>>({});
  const [expandedPublicTasks, setExpandedPublicTasks] = useState<Record<string, boolean>>({});

  const toggle = (set: React.Dispatch<React.SetStateAction<Record<string, boolean>>>, id: string) => {
    set(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{ width: 260, minWidth: 260, maxWidth: 260, boxSizing: 'border-box', flex: '0 0 260px', borderRight: '1px solid #eee', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      <div style={{ padding: 12, fontWeight: 700 }}>主页空间</div>

      <SectionTitle title="主页" />
      <div>
        <Row label={<span>最近编辑</span>} onClick={() => onSelectHome()} />
      </div>

      <SectionTitle title="我的空间" />
      <div>
        {mySpace.map((p) => (
          <div key={p.id}>
            <Row
              label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{expandedMyProjects[p.id] ? <IconChevronDown /> : <IconChevronRight />}<span>{p.name}</span></span>}
              onClick={() => toggle(setExpandedMyProjects, p.id)}
            />
            {expandedMyProjects[p.id] && (
              <div style={{ marginLeft: 16 }}>
                {/* 若后端提供任务，则展示任务层；否则直接展示项目下的表 */}
                {(Array.isArray(p.tasks) && p.tasks.length > 0) ? (
                  p.tasks.map((t) => (
                    <div key={t.id}>
                      <Row
                        label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{expandedMyTasks[t.id] ? <IconChevronDown /> : <IconChevronRight />}<span>{t.name}</span></span>}
                        onClick={() => toggle(setExpandedMyTasks, t.id)}
                      />
                      {expandedMyTasks[t.id] && (
                        <div style={{ marginLeft: 16 }}>
                          {(t.tables || []).map(tb => (
                            <Row key={tb.id} label={<span>{tb.name}</span>} onClick={() => onSelectMyTable(tb.id)} />
                          ))}
                          {(t.tables || []).length === 0 && (
                            <div style={{ padding: '4px 12px', color: '#888' }}>暂无数据表</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  (p.tables || []).map(tb => (
                    <Row key={tb.id} label={<span>{tb.name}</span>} onClick={() => onSelectMyTable(tb.id)} />
                  ))
                )}
                {(Array.isArray(p.tasks) && p.tasks.length === 0 && (p.tables || []).length === 0) && (
                  <div style={{ padding: '4px 12px', color: '#888' }}>暂无数据表</div>
                )}
              </div>
            )}
          </div>
        ))}
        {mySpace.length === 0 && (
          <div style={{ padding: '4px 12px', color: '#888' }}>暂无项目</div>
        )}
      </div>

      <SectionTitle title="项目空间" />
      <div>
        {publicSpace.map((p) => (
          <div key={p.id}>
            <Row
              label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{expandedPublicProjects[p.id] ? <IconChevronDown /> : <IconChevronRight />}<span>{p.name}</span></span>}
              onClick={() => toggle(setExpandedPublicProjects, p.id)}
            />
            {expandedPublicProjects[p.id] && (
              <div style={{ marginLeft: 16 }}>
                {(Array.isArray(p.tasks) && p.tasks.length > 0) ? (
                  p.tasks.map((t) => (
                    <div key={t.id}>
                      <Row
                        label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{expandedPublicTasks[t.id] ? <IconChevronDown /> : <IconChevronRight />}<span>{t.name}</span></span>}
                        onClick={() => toggle(setExpandedPublicTasks, t.id)}
                      />
                      {expandedPublicTasks[t.id] && (
                        <div style={{ marginLeft: 16 }}>
                          {(t.tables || []).map(tb => (
                            <Row key={tb.id} label={<span>{tb.name}</span>} onClick={() => onSelectPublicTable(tb.id)} />
                          ))}
                          {(t.tables || []).length === 0 && (
                            <div style={{ padding: '4px 12px', color: '#888' }}>暂无公开数据表</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  (p.tables || []).map(tb => (
                    <Row key={tb.id} label={<span>{tb.name}</span>} onClick={() => onSelectPublicTable(tb.id)} />
                  ))
                )}
                {(Array.isArray(p.tasks) && p.tasks.length === 0 && (p.tables || []).length === 0) && (
                  <div style={{ padding: '4px 12px', color: '#888' }}>暂无公开数据表</div>
                )}
              </div>
            )}
          </div>
        ))}
        {publicSpace.length === 0 && (
          <div style={{ padding: '4px 12px', color: '#888' }}>暂无公开项目</div>
        )}
      </div>

      <SectionTitle title="文件夹" />
      <div>
        <Row label={<span>文件管理</span>} onClick={() => onSelectFiles()} />
      </div>

      {isAdmin && (
        <>
          <SectionTitle title="管理员" />
          <div>
            <Row label={<span>管理员中心</span>} onClick={() => onSelectAdmin && onSelectAdmin()} />
          </div>
        </>
      )}
    </div>
  );
}