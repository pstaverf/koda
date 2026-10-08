import { Outlet, useLocation } from "react-router";
import { GlassPanel } from "../../components/GlassPanel.js";
import { KodaLogo } from "../../components/KodaLogo.js";
import { Steps } from "../../components/Steps.js";
import { paths } from "../../routes.js";
import { strings } from "../../strings.js";

const stepIndexes: Record<string, number> = {
  [paths.register]: 0,
  [paths.registerCode]: 1,
  [paths.registerPassword]: 2,
  [paths.registerPhoto]: 3,
  [paths.registerName]: 4
};

export const RegisterLayout = () => {
  const location = useLocation();
  const current = stepIndexes[location.pathname] ?? 0;
  return (
    <div className="screen-center">
      <GlassPanel variant="strong" className="register-card">
        <header className="register-head">
          <KodaLogo size={44} withWordmark />
          <p className="text-secondary">{strings.register.subtitle}</p>
        </header>
        <Steps steps={strings.register.steps} current={current} />
        <Outlet />
      </GlassPanel>
    </div>
  );
};
