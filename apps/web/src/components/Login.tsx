import { useState } from 'react';
import { login as authLogin } from '../services/auth';

type Props = { onSuccess?: () => void };

export default function Login({ onSuccess }: Props) {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authLogin(email, password);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f7f7f7' }}>
      <form onSubmit={handleSubmit} style={{ width: 360, padding: 24, borderRadius: 12, background: '#fff', boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>登录到多维数据表格</div>
        <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 6 }}>邮箱</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="请输入邮箱"
               style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 12 }}/>
        <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 6 }}>密码</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码"
               style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 12 }}/>
        {error && <div style={{ color: '#c33', fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', background: '#2d7ef7', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  );
}