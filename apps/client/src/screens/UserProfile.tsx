import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ApiError } from "../api/http.js";
import { fetchUserProfile } from "../api/profile.js";
import { Avatar } from "../components/Avatar.js";
import { Banner } from "../components/Banner.js";
import { GlassButton } from "../components/GlassButton.js";
import { GlassPanel } from "../components/GlassPanel.js";
import { Spinner } from "../components/Spinner.js";
import { paths } from "../routes.js";
import { errorText, strings } from "../strings.js";
import { useProfileStore } from "../store/profile.js";

const hiddenBanner = { bannerUrl: null, bannerStyle: null };

export const UserProfile = () => {
  const navigate = useNavigate();
  const params = useParams();
  const publicId = params["publicId"] ?? "";
  const setViewed = useProfileStore((state) => state.setViewed);
  const view = useProfileStore((state) => state.viewed[publicId]);
  const query = useQuery({
    queryKey: ["users", publicId],
    queryFn: () => fetchUserProfile(publicId),
    enabled: publicId.length > 0
  });

  useEffect(() => {
    if (query.data !== undefined) {
      setViewed(query.data);
    }
  }, [query.data, setViewed]);

  if (query.isError) {
    return (
      <GlassPanel variant="strong" className="profile-view">
        <h1 className="title-3">{strings.user.notFound}</h1>
        <p className="text-secondary">
          {errorText(query.error instanceof ApiError ? query.error.code : "NOT_FOUND")}
        </p>
        <GlassButton variant="primary" onClick={() => navigate(paths.friends)}>
          {strings.user.toFriends}
        </GlassButton>
      </GlassPanel>
    );
  }

  const data = query.data ?? view ?? null;

  if (data === null) {
    return (
      <div className="screen-center">
        <Spinner size={24} label={strings.common.loading} />
      </div>
    );
  }

  const online = data.presence.status === "online";
  const presenceText = online
    ? strings.user.online
    : data.presence.lastSeen.hidden
      ? strings.user.lastSeenHidden
      : (data.presence.lastSeen.text ?? strings.user.offline);

  return (
    <div className="page">
      <GlassButton variant="ghost" icon={ArrowLeft} onClick={() => navigate(-1)}>
        {strings.common.back}
      </GlassButton>
      <section className="profile-card glass-flat">
        <Banner user={data.bannerVisible ? data.user : hiddenBanner} height={160} />
        <div className="profile-card-body">
          <Avatar
            name={data.user.displayName}
            publicId={data.user.publicId}
            url={data.user.avatarUrl}
            size={96}
            online={online}
            className="profile-avatar"
          />
          <div className="profile-card-text">
            <h1 className="title-2">{data.user.displayName ?? data.user.publicId}</h1>
            <span className="text-tertiary text-mono">{data.user.publicId}</span>
          </div>
        </div>
      </section>
      <GlassPanel className="profile-view">
        <p className="profile-status">
          <span className={["status-dot", online ? "is-online" : null].filter(Boolean).join(" ")} />
          {presenceText}
        </p>
        {data.blockedByMe ? (
          <p className="profile-note">{strings.user.blocked}</p>
        ) : data.bioVisible ? (
          data.user.bio === null ? null : <p>{data.user.bio}</p>
        ) : (
          <p className="text-tertiary">{strings.user.bioHidden}</p>
        )}
        <p className="text-secondary">{strings.user.relations[data.relation]}</p>
      </GlassPanel>
    </div>
  );
};
