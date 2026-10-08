import { LogOut, Settings, UserRound, Users } from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import { logout } from "../api/auth.js";
import { paths } from "../routes.js";
import { strings } from "../strings.js";
import { useSessionStore } from "../store/session.js";
import { toast } from "../store/toasts.js";
import { Avatar } from "./Avatar.js";
import { GlassButton } from "./GlassButton.js";

const items = [
  { to: paths.profile, label: strings.nav.profile, icon: UserRound },
  { to: paths.friends, label: strings.nav.friends, icon: Users },
  { to: paths.settings, label: strings.nav.settings, icon: Settings }
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);

  const signOut = async (): Promise<void> => {
    try {
      await logout();
      toast.success(strings.profile.loggedOut);
      navigate(paths.login, { replace: true });
    } catch {
      toast.error(strings.common.retry);
    }
  };

  return (
    <aside className="sidebar glass-flat">
      {user === null ? null : (
        <NavLink className="sidebar-user glass-interactive" to={paths.profile}>
          <Avatar name={user.displayName} url={user.avatarUrl} size={44} />
          <span className="sidebar-user-text">
            <span className="sidebar-user-name">{user.displayName ?? user.publicId}</span>
            <span className="text-tertiary text-mono">{user.publicId}</span>
          </span>
        </NavLink>
      )}
      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => ["sidebar-link", isActive ? "is-active" : null].filter(Boolean).join(" ")}
          >
            <item.icon size={20} strokeWidth={1.75} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <GlassButton variant="ghost" icon={LogOut} block onClick={() => void signOut()}>
          {strings.profile.logout}
        </GlassButton>
      </div>
    </aside>
  );
};
