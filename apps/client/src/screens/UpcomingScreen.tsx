import { useNavigate } from "react-router";
import { GlassButton } from "../components/GlassButton.js";
import { GlassPanel } from "../components/GlassPanel.js";
import { KodaLogo } from "../components/KodaLogo.js";

type UpcomingScreenProps = {
  title: string;
  text: string;
  actionLabel?: string;
  actionTo?: string;
};

export const UpcomingScreen = ({ title, text, actionLabel, actionTo }: UpcomingScreenProps) => {
  const navigate = useNavigate();
  return (
    <div className="screen-center">
      <GlassPanel variant="strong" className="upcoming">
        <KodaLogo size={48} />
        <h1 className="title-2">{title}</h1>
        <p className="text-secondary">{text}</p>
        {actionLabel !== undefined && actionTo !== undefined ? (
          <GlassButton variant="primary" onClick={() => navigate(actionTo)}>
            {actionLabel}
          </GlassButton>
        ) : null}
      </GlassPanel>
    </div>
  );
};
