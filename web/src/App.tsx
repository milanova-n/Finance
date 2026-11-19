import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { AppRoutes } from './routes/AppRoutes';
import { useAuth } from './context/AuthContext';

export function App() {
  const { user, ready } = useAuth();

  if (!ready) return null;
  if (!user) return <Login />;

  return (
    <AppLayout>
      <AppRoutes />
    </AppLayout>
  );
}