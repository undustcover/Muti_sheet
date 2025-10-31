import { useEffect, useState } from 'react';
import Login from './Login';
import App from '../App';
import { authBootstrap, getUser, getToken } from '../services/auth';

export default function AppShell() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await authBootstrap();
      if (!mounted) return;
      const token = getToken();
      const user = getUser();
      setAuthed(!!token && !!user);
      setReady(true);
    })();
    return () => { mounted = false; };
  }, []);

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div>加载中...</div>
      </div>
    );
  }

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }
  return <App />;
}