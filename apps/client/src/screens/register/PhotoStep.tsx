import { UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { uploadAvatar } from "../../api/media.js";
import { ApiError } from "../../api/http.js";
import { GlassButton } from "../../components/GlassButton.js";
import { ImageCropper } from "../../components/ImageCropper.js";
import { readFileAsDataUrl, validateImageFile } from "../../lib/files.js";
import { paths } from "../../routes.js";
import { errorText, strings } from "../../strings.js";
import { useSessionStore } from "../../store/session.js";
import { toast } from "../../store/toasts.js";

type Pending = {
  file: File;
  url: string;
};

export const PhotoStep = () => {
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const pick = async (file: File | undefined): Promise<void> => {
    if (file === undefined) {
      return;
    }
    const problem = validateImageFile(file, "avatar");
    if (problem !== null) {
      toast.error(errorText(problem));
      return;
    }
    setPending({ file, url: await readFileAsDataUrl(file) });
  };

  const apply = async (blob: Blob): Promise<void> => {
    if (user === null) {
      return;
    }
    try {
      const result = await uploadAvatar(blob);
      setUser({ ...user, avatarUrl: result.avatarUrl });
      setPending(null);
      toast.success(strings.register.photo.saved);
      navigate(paths.registerName);
    } catch (failure) {
      toast.error(errorText(failure instanceof ApiError ? failure.code : "NETWORK_ERROR"));
    }
  };

  if (user === null) {
    return null;
  }
  if (user.displayName !== null) {
    return <Navigate to={paths.profile} replace />;
  }

  return (
    <div className="register-form">
      <div className="register-title">
        <h1 className="title-3">{strings.register.photo.title}</h1>
        <p className="text-secondary">{strings.register.photo.text}</p>
      </div>
      <div className="avatar-picker">
        <span className="avatar-preview">
          {pending !== null ? (
            <img src={pending.url} alt="" />
          ) : user.avatarUrl === null ? (
            <UserRound size={64} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <img src={user.avatarUrl} alt="" />
          )}
        </span>
        <div className="register-actions">
          <GlassButton variant="primary" onClick={() => inputRef.current?.click()}>
            {user.avatarUrl === null ? strings.register.photo.pick : strings.register.photo.change}
          </GlassButton>
          <GlassButton variant="ghost" disabled={pending !== null} onClick={() => navigate(paths.registerName)}>
            {strings.register.photo.skip}
          </GlassButton>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => {
          void pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {pending === null ? null : (
        <ImageCropper
          file={pending.file}
          kind="avatar"
          title={strings.register.photo.cropTitle}
          onCancel={() => setPending(null)}
          onApply={apply}
        />
      )}
    </div>
  );
};
