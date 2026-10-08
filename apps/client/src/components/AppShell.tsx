import { Outlet } from "react-router";
import { BottomNav } from "./BottomNav.js";
import { Sidebar } from "./Sidebar.js";

export const AppShell = () => (
  <div className="shell">
    <Sidebar />
    <main className="shell-main">
      <Outlet />
    </main>
    <BottomNav />
  </div>
);
