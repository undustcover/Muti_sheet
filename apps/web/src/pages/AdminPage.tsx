import { useEffect, useState } from 'react';
import { API_BASE, authHeaders } from '../services/auth';

type UserItem = { id: string; email: string; name: string; role: 'OWNER'|'ADMIN'|'EDITOR'|'VIEWER'; isLocked: boolean; createdAt: string };
type Setting = { id: string; inviteOnlyRegistration: boolean };
type InviteItem = { id: string; name: string; token: string; usedAt?: string | null; expiresAt?: string | null; createdAt: string };

export default function AdminPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [setting, setSetting] = useState<Setting | null>(null);
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [newInviteName, setNewInviteName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      const [s, us, ins] = await Promise.all([
        fetch(`${API_BASE}/admin/settings`, { headers: { 'Content-Type': 'application/json', ...authHeaders() } }).then(r => r.json()),
        fetch(`${API_BASE}/admin/users`, { headers: { 'Content-Type': 'application/json', ...authHeaders() } }).then(r => r.json()),
        fetch(`${API_BASE}/admin/invites`, { headers: { 'Content-Type': 'application/json', ...authHeaders() } }).then(r => r.json()),
      ]);
      setSetting(s);
      setUsers(us);
      setInvites(ins);
    } catch (err: any) {
      setError(err?.message || '管理员数据加载失败');
    }
  };

  useEffect(() => { loadAll(); }, []);

  const toggleInviteOnly = async (v: boolean) => {
    await fetch(`${API_BASE}/admin/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ inviteOnlyRegistration: v }) });
    await loadAll();
  };

  const updateUserRole = async (id: string, role: UserItem['role']) => {
    await fetch(`${API_BASE}/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ role }) });
    await loadAll();
  };

  const lockUser = async (id: string, isLocked: boolean) => {
    await fetch(`${API_BASE}/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ isLocked }) });
    await loadAll();
  };

  const deleteUser = async (id: string) => {
    await fetch(`${API_BASE}/admin/users/${id}:delete`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() } });
    await loadAll();
  };

  const createInvite = async () => {
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/admin/invites`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ name: newInviteName }) });
      if (!resp.ok) { throw new Error(await resp.text()); }
      await loadAll();
      setNewInviteName('');
    } catch (err: any) {
      setError(err?.message || '创建邀请失败');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>管理员中心</h2>
      {error && <div style={{ color: '#c33', marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <h3>系统设置</h3>
          <label style={{ display: 'block', margin: '8px 0' }}>
            <input type="checkbox" checked={!!setting?.inviteOnlyRegistration} onChange={e => toggleInviteOnly(e.target.checked)} /> 仅邀请注册模式
          </label>
        </div>
        <div style={{ flex: 1 }}>
          <h3>邀请管理</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input value={newInviteName} onChange={e => setNewInviteName(e.target.value)} placeholder="输入受邀用户名字"
                   style={{ flex: 1, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }} />
            <button onClick={createInvite} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #2d7ef7', background: '#2d7ef7', color: '#fff' }}>生成邀请</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th style={{ textAlign: 'left' }}>名字</th><th>状态</th><th>邀请链接</th></tr>
            </thead>
            <tbody>
              {invites.map(it => (
                <tr key={it.id}>
                  <td>{it.name}</td>
                  <td>{it.usedAt ? '已使用' : '未使用'}</td>
                  <td style={{ fontSize: 12, color: '#555' }}>{it.token ? `${window.location.origin}/invite/${it.token}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3>用户管理</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th style={{ textAlign: 'left' }}>邮箱</th><th>名字</th><th>角色</th><th>锁定</th><th>操作</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.name}</td>
                <td>
                  <select value={u.role} onChange={e => updateUserRole(u.id, e.target.value as any)}>
                    <option value="VIEWER">VIEWER</option>
                    <option value="EDITOR">EDITOR</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                </td>
                <td>
                  <input type="checkbox" checked={u.isLocked} onChange={e => lockUser(u.id, e.target.checked)} />
                </td>
                <td>
                  <button onClick={() => deleteUser(u.id)} style={{ padding: '4px 8px' }}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}