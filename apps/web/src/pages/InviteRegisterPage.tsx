import { useEffect, useState } from 'react';
import { inviteValidate, inviteRegister } from '../services/auth';

type Props = { token?: string };

export default function InviteRegisterPage({ token }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!token) { setError('缺少邀请令牌'); return; }
      try {
        const info = await inviteValidate(token);
        setName(info.name);
      } catch (err: any) {
        setError(err?.message || '邀请不可用或已过期');
      }
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await inviteRegister(token, email, password);
    } catch (err: any) {
      setError(err?.message || '邀请注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f7f7f7' }}>
      <form onSubmit={handleSubmit} style={{ width: 360, padding: 24, borderRadius: 12, background: '#fff', boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>邀请注册</div>
        <div style={{ marginBottom: 12, color: '#555' }}>受邀用户：{name || '未识别'}</div>
        <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 6 }}>邮箱</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="请输入邮箱"
               style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 12 }}/>
        <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 6 }}>密码</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码（至少6位）"
               style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 12 }}/>
        {error && <div style={{ color: '#c33', fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <button type="submit" disabled={loading || !token} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', background: '#2d7ef7', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          {loading ? '注册中...' : '使用邀请注册'}
        </button>
      </form>
    </div>
  );
}