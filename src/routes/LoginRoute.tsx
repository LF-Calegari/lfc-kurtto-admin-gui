import { Navigate } from 'react-router-dom';

import { SessionBootstrapSpinner } from '../components/ui/SessionBootstrapSpinner/SessionBootstrapSpinner';
import { ROUTES } from '../constants/routes';
import { useAuth } from '../contexts/AuthContext';
import Login from '../pages/Login/Login';

export function LoginRoute(): JSX.Element {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <SessionBootstrapSpinner />;
  }

  if (user) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <Login />;
}
