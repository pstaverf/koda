import { useEffect } from "react";
import { Outlet } from "react-router";
import { startRealtime, stopRealtime } from "../ws/connection.js";
import { BottomNav } from "./BottomNav.js";
import { Sidebar } from "./Sidebar.js";

export const AppShell = () => {
  useEffect(() => {
    startRealtime();
    return () => {
      stopRealtime();
    };
  }, []);

  return (
    <div className="shell">
      <Sidebar />
      <main className="shell-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
