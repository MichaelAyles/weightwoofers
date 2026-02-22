import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useRouter } from './lib/router';
import { LandingPage } from './components/LandingPage';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';
import { PetsPage } from './components/PetsPage';
import { AdminPage } from './components/AdminPage';

function AppRoutes() {
  const { user, loading } = useAuth();
  const { route, navigate } = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-dim flex items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  // Not authenticated — show public routes
  if (!user) {
    if (route === 'login') {
      return (
        <AuthForm
          mode="login"
          onSwitch={() => navigate('signup')}
          onSuccess={() => navigate('dashboard')}
        />
      );
    }
    if (route === 'signup') {
      return (
        <AuthForm
          mode="signup"
          onSwitch={() => navigate('login')}
          onSuccess={() => navigate('dashboard')}
        />
      );
    }
    return (
      <LandingPage
        onSignUp={() => navigate('signup')}
        onLogIn={() => navigate('login')}
      />
    );
  }

  // Authenticated routes
  if (route === 'pets') {
    return <PetsPage onBack={() => navigate('dashboard')} />;
  }

  if (route.startsWith('admin') && user.is_admin) {
    return <AdminPage onBack={() => navigate('dashboard')} />;
  }

  // Redirect non-admin away from admin routes
  if (route.startsWith('admin')) {
    navigate('dashboard');
  }

  return <Dashboard onNavigatePets={() => navigate('pets')} onNavigateAdmin={user.is_admin ? () => navigate('admin') : undefined} />;
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
