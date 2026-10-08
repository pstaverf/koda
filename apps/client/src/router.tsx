import { Compass } from "lucide-react";
import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router";
import { GlassButton } from "./components/GlassButton.js";
import { GlassPanel } from "./components/GlassPanel.js";
import { KodaLogo } from "./components/KodaLogo.js";
import { Spinner } from "./components/Spinner.js";
import { strings } from "./strings.js";
import { useSessionStore } from "./store/session.js";

export const paths = {
  home: "/",
  login: "/login",
  register: "/register",
  registerName: "/register/name",
  reset: "/reset",
  profile: "/profile",
  friends: "/friends",
  settings: "/settings"
} as const;

type RedirectState = {
  from?: string;
};

const SessionSplash = () => (
  <div className="screen-center" aria-busy="true">
    <KodaLogo size={56} />
    <Spinner size={22} label={strings.common.loading} />
  </div>
);

const RequireSession = () => {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const location = useLocation();
  if (status === "loading") {
    return <SessionSplash />;
  }
  if (status === "anonymous" || user === null) {
    const state: RedirectState = { from: `${location.pathname}${location.search}` };
    return <Navigate to={paths.login} replace state={state} />;
  }
  if (user.displayName === null && location.pathname !== paths.registerName) {
    return <Navigate to={paths.registerName} replace />;
  }
  return <Outlet />;
};

const RequireGuest = () => {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const location = useLocation();
  if (status === "loading") {
    return <SessionSplash />;
  }
  if (status === "authenticated" && user !== null) {
    if (user.displayName === null) {
      return <Navigate to={paths.registerName} replace />;
    }
    const state = location.state as RedirectState | null;
    const target = typeof state?.from === "string" && state.from.startsWith("/") ? state.from : paths.profile;
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
};

const HomeRedirect = () => {
  const status = useSessionStore((state) => state.status);
  if (status === "loading") {
    return <SessionSplash />;
  }
  return <Navigate to={status === "authenticated" ? paths.profile : paths.login} replace />;
};

const NotFound = () => (
  <div className="screen-center">
    <GlassPanel variant="strong" className="not-found">
      <Compass size={40} strokeWidth={1.5} aria-hidden="true" />
      <h1 className="title-2">{strings.notFound.title}</h1>
      <p className="text-secondary">{strings.notFound.text}</p>
      <GlassButton variant="primary" onClick={() => router.navigate(paths.home)}>
        {strings.notFound.action}
      </GlassButton>
    </GlassPanel>
  </div>
);

export const router = createBrowserRouter([
  { path: paths.home, element: <HomeRedirect /> },
  { element: <RequireGuest />, children: [] },
  { element: <RequireSession />, children: [] },
  { path: "*", element: <NotFound /> }
]);
