import { Settings, UserRound, Users } from "lucide-react";
import { NavLink } from "react-router";
import { paths } from "../routes.js";
import { strings } from "../strings.js";

const items = [
  { to: paths.profile, label: strings.nav.profile, icon: UserRound },
  { to: paths.friends, label: strings.nav.friends, icon: Users },
  { to: paths.settings, label: strings.nav.settings, icon: Settings }
];

export const BottomNav = () => (
  <nav className="bottom-nav glass-strong">
    {items.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) => ["bottom-nav-link", isActive ? "is-active" : null].filter(Boolean).join(" ")}
      >
        {({ isActive }) => (
          <>
            <item.icon size={24} strokeWidth={1.75} fill={isActive ? "currentColor" : "none"} aria-hidden="true" />
            <span>{item.label}</span>
          </>
        )}
      </NavLink>
    ))}
  </nav>
);
