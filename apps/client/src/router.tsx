import { Compass } from "lucide-react";
import { createBrowserRouter, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { GlassButton } from "./components/GlassButton.js";
import { GlassPanel } from "./components/GlassPanel.js";
import { KodaLogo } from "./components/KodaLogo.js";
import { Spinner } from "./components/Spinner.js";
import { CodeStep } from "./screens/register/CodeStep.js";
import { EmailStep } from "./screens/register/EmailStep.js";
import { NameStep } from "./screens/register/NameStep.js";
import { PasswordStep } from "./screens/register/PasswordStep.js";
import { PhotoStep } from "./screens/register/PhotoStep.js";
import { Login } from "./screens/Login.js";
import { Profile } from "./screens/Profile.js";
import { RegisterLayout } from "./screens/register/RegisterLayout.js";
import { ResetPassword } from "./screens/ResetPassword.js";
import { UserProfile } from "./screens/UserProfile.js";
import { paths } from "./routes.js";
import { strings } from "./strings.js";
import { useSessionStore } from "./store/session.js";

const incompleteProfilePaths: readonly string[] = [paths.registerPhoto, paths.registerName];

type RedirectState = {
  from?: string;
};

const SessionSplash = () => (
  <div className="screen-center" aria-busy="true">
    <KodaLogo size={56} />
    <Spinner size={24} label={strings.common.loading} />
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
  if (user.displayName === null && !incompleteProfilePaths.includes(location.pathname)) {
    return <Navigate to={paths.registerPhoto} replace />;
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
      return <Navigate to={paths.registerPhoto} replace />;
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

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="screen-center">
      <GlassPanel variant="strong" className="not-found">
        <Compass size={24} strokeWidth={1.75} aria-hidden="true" />
        <h1 className="title-2">{strings.notFound.title}</h1>
        <p className="text-secondary">{strings.notFound.text}</p>
        <GlassButton variant="primary" onClick={() => navigate(paths.home)}>
          {strings.notFound.action}
        </GlassButton>
      </GlassPanel>
    </div>
  );
};

export const router = createBrowserRouter([
  { path: paths.home, element: <HomeRedirect /> },
  {
    element: <RequireGuest />,
    children: [
      {
        path: paths.register,
        element: <RegisterLayout />,
        children: [
          { index: true, element: <EmailStep /> },
          { path: "code", element: <CodeStep /> },
          { path: "password", element: <PasswordStep /> }
        ]
      },
      { path: paths.login, element: <Login /> },
      { path: paths.reset, element: <ResetPassword /> }
    ]
  },
  {
    element: <RequireSession />,
    children: [
      {
        path: paths.registerPhoto,
        element: <RegisterLayout />,
        children: [{ index: true, element: <PhotoStep /> }]
      },
      {
        path: paths.registerName,
        element: <RegisterLayout />,
        children: [{ index: true, element: <NameStep /> }]
      },
      { path: paths.profile, element: <Profile /> },
      { path: paths.profileUser, element: <UserProfile /> }
    ]
  },
  { path: "*", element: <NotFound /> }
]);
