import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { SessionBootstrapSpinner } from '../components/ui/SessionBootstrapSpinner/SessionBootstrapSpinner';
import { ROUTES } from '../constants/routes';
import { useAuth } from '../contexts/AuthContext';

import { resolveRouteCode } from './routeCodes';

export function ProtectedRoute(): JSX.Element {
  const { user, isBootstrapping, verifyRoute } = useAuth();
  const location = useLocation();

  // Guarda o controller da chamada anterior para cancelar em caso de
  // navegação rápida — evita empilhar Promises e setStates em sequência.
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!user) {
      // Sem sessão: o `Navigate` abaixo cuida; não dispara verify.
      return;
    }
    const routeCode = resolveRouteCode(location.pathname);
    if (!routeCode) {
      // Rota privada não mapeada (ex.: rotas placeholder). Skip — o
      // backend exigiria `X-Route-Code` e rejeitaria com 400.
      return;
    }

    // Cancela request em voo, se houver.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    // Disparo "fire-and-forget": o `verifyRoute` no Provider trata
    // 401/403/falha internamente. Passamos o pathname capturado via
    // `useLocation()` para que o redirect 403 popule `state.from`
    // corretamente em qualquer Router (BrowserRouter, MemoryRouter
    // de testes), sem depender de `window.location.pathname`.
    void verifyRoute(routeCode, {
      signal: controller.signal,
      fromPathname: location.pathname,
    });

    return () => {
      controller.abort();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [user, location.pathname, verifyRoute]);

  if (isBootstrapping) {
    return <SessionBootstrapSpinner />;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
