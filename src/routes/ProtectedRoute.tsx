import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { SessionBootstrapSpinner } from '../components/ui/SessionBootstrapSpinner/SessionBootstrapSpinner';
import { ROUTES } from '../constants/routes';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute(): JSX.Element {
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <SessionBootstrapSpinner />;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
