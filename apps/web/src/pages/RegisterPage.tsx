import { useState } from 'react';
import { register } from '../services/auth';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(email, name, password);
    } catch (err: any) {
      setError(err?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f7f7f7' }}>
      <form onSubmit={handleSubmit} style={{ width: 360, padding: 24, borderRadius: 12, background: '#fff', boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>注册账号</div>
        <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 6 }}>邮箱</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="请输入邮箱"
               style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 12 }}/>
        <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 6 }}>姓名</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="请输入姓名"
               style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 12 }}/>
        <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 6 }}>密码</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码（至少6位）"
               style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 12 }}/>
        {error && <div style={{ color: '#c33', fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', background: '#2d7ef7', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          {loading ? '注册中...' : '注册'}
        </button>
      </form>
    </div>
  );
}