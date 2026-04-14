import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { SessionBootstrapSpinner } from './components/ui/SessionBootstrapSpinner/SessionBootstrapSpinner';
import { ROUTES } from './constants/routes';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home/Home';
import { LoginRoute } from './routes/LoginRoute';
import { ProtectedRoute } from './routes/ProtectedRoute';

function RootRedirect(): JSX.Element {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <SessionBootstrapSpinner />;
  }

  return <Navigate to={user ? ROUTES.HOME : ROUTES.LOGIN} replace />;
}

function CatchAllRedirect(): JSX.Element {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <SessionBootstrapSpinner />;
  }

  return <Navigate to={user ? ROUTES.HOME : ROUTES.LOGIN} replace />;
}

function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<LoginRoute />} />
      <Route element={<ProtectedRoute />}>
        <Route path={ROUTES.HOME} element={<Home />} />
      </Route>
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<CatchAllRedirect />} />
    </Routes>
  );
}

function App(): JSX.Element {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
