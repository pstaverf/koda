import { bannerPalette } from "@koda/shared/constants";
import {
  bioSchema,
  displayNameSchema,
  type BannerStyle,
  type BannerStyleValue,
  type CurrentUser
} from "@koda/shared/profile";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageUp, LogOut, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { logout } from "../api/auth.js";
import { ApiError } from "../api/http.js";
import { deleteAvatar, deleteBanner, uploadAvatar, uploadBanner } from "../api/media.js";
import { fetchOwnProfile, updateOwnProfile } from "../api/profile.js";
import { Avatar } from "../components/Avatar.js";
import { Banner } from "../components/Banner.js";
import { EmojiButton } from "../components/EmojiButton.js";
import { Field } from "../components/Field.js";
import { GlassButton } from "../components/GlassButton.js";
import { GlassInput } from "../components/GlassInput.js";
import { GlassPanel } from "../components/GlassPanel.js";
import { GlassTextarea } from "../components/GlassTextarea.js";
import { ImageCropper } from "../components/ImageCropper.js";
import { Spinner } from "../components/Spinner.js";
import { readFileAsDataUrl, validateImageFile } from "../lib/files.js";
import { paths } from "../routes.js";
import { asErrorCode, errorText, strings, type ClientErrorCode } from "../strings.js";
import { useSessionStore } from "../store/session.js";
import { toast } from "../store/toasts.js";

const presetBackground = (preset: BannerStyleValue): string => {
  if (preset.type === "color") {
    return preset.value;
  }
  return preset.type === "gradient" ? `linear-gradient(${preset.angle}deg, ${preset.from}, ${preset.to})` : "transparent";
};

const sameBannerStyle = (current: BannerStyle, preset: BannerStyleValue): boolean => {
  if (current === null || current.type !== preset.type) {
    return false;
  }
  if (current.type === "color" && preset.type === "color") {
    return current.value === preset.value;
  }
  if (current.type === "gradient" && preset.type === "gradient") {
    return current.from === preset.from && current.to === preset.to && current.angle === preset.angle;
  }
  return false;
};

type CropTarget = "avatar" | "banner";

type UploadInput = {
  target: CropTarget;
  blob: Blob;
};

const failureCodeOf = (failure: Error): ClientErrorCode =>
  failure instanceof ApiError ? failure.code : "UNKNOWN_ERROR";

export const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionUser = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(sessionUser?.displayName ?? "");
  const [bio, setBio] = useState(sessionUser?.bio ?? "");
  const [crop, setCrop] = useState<{ target: CropTarget; file: File; url: string } | null>(null);

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: fetchOwnProfile,
    initialData: sessionUser ?? undefined
  });

  const user: CurrentUser | null = profile.data ?? sessionUser;

  const save = useMutation({
    mutationFn: () =>
      updateOwnProfile({
        displayName: displayNameSchema.parse(name),
        bio: bioSchema.parse(bio)
      }),
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.setQueryData(["profile"], updated);
      toast.success(strings.profile.saved);
    },
    onError: (failure: Error) => toast.error(errorText(failureCodeOf(failure)))
  });

  const applyPreset = useMutation({
    mutationFn: (preset: BannerStyleValue) => updateOwnProfile({ bannerStyle: preset }),
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.setQueryData(["profile"], updated);
      toast.success(strings.profile.bannerUpdated);
    },
    onError: (failure: Error) => toast.error(errorText(failureCodeOf(failure)))
  });

  const applyUpload = useMutation({
    mutationFn: async (input: UploadInput): Promise<void> => {
      if (input.target === "banner") {
        await uploadBanner(input.blob);
        return;
      }
      await uploadAvatar(input.blob);
    },
    onSuccess: async () => {
      const fresh = await fetchOwnProfile();
      setUser(fresh);
      queryClient.setQueryData(["profile"], fresh);
      toast.success(strings.profile.photoUpdated);
    },
    onError: (failure: Error) => toast.error(errorText(failureCodeOf(failure)))
  });

  const removeImage = useMutation({
    mutationFn: async (target: CropTarget): Promise<void> => {
      if (target === "banner") {
        await deleteBanner();
        return;
      }
      await deleteAvatar();
    },
    onSuccess: async () => {
      const fresh = await fetchOwnProfile();
      setUser(fresh);
      queryClient.setQueryData(["profile"], fresh);
      toast.success(strings.profile.photoRemoved);
    },
    onError: (failure: Error) => toast.error(errorText(failureCodeOf(failure)))
  });

  const signOut = async (): Promise<void> => {
    try {
      await logout();
    } catch {
      toast.error(strings.common.retry);
      return;
    }
    toast.success(strings.profile.loggedOut);
    navigate(paths.login, { replace: true });
  };

  const pick = async (target: CropTarget, file: File | undefined): Promise<void> => {
    if (file === undefined) {
      return;
    }
    const problem = validateImageFile(file, target);
    if (problem !== null) {
      toast.error(errorText(problem));
      return;
    }
    setCrop({ target, file, url: await readFileAsDataUrl(file) });
  };

  if (user === null) {
    return (
      <div className="screen-center">
        <Spinner size={24} label={strings.common.loading} />
      </div>
    );
  }

  const nameError = asErrorCode(displayNameSchema.safeParse(name).success ? undefined : "DISPLAY_NAME_INVALID");
  const bioError = asErrorCode(bioSchema.safeParse(bio).success ? undefined : "BIO_TOO_LONG");

  return (
    <div className="page">
      <section className="profile-card glass-flat">
        <Banner user={user} height={160} />
        <div className="profile-card-body">
          <Avatar
            name={user.displayName}
            publicId={user.publicId}
            url={user.avatarUrl}
            size={96}
            className="profile-avatar"
          />
          <div className="profile-card-text">
            <h1 className="title-2">{user.displayName ?? user.publicId}</h1>
            <span className="text-tertiary text-mono">{user.publicId}</span>
          </div>
        </div>
      </section>

      <GlassPanel className="profile-fields">
        <h2 className="title-3">{strings.profile.editTitle}</h2>
        <Field label={strings.profile.nameLabel} htmlFor="profile-name" error={nameError}>
          <GlassInput
            id="profile-name"
            value={name}
            maxLength={32}
            invalid={nameError !== undefined}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label={strings.profile.bioLabel} htmlFor="profile-bio" hint={strings.profile.bioHint} error={bioError}>
          <div className="bio-row">
            <GlassTextarea
              id="profile-bio"
              value={bio}
              maxLength={200}
              showCounter
              invalid={bioError !== undefined}
              onChange={(event) => setBio(event.target.value)}
            />
            <EmojiButton onSelect={(native) => setBio((current) => `${current}${native}`)} />
          </div>
        </Field>
        <div className="profile-actions">
          <GlassButton
            variant="primary"
            loading={save.isPending}
            disabled={nameError !== undefined || bioError !== undefined}
            onClick={() => save.mutate()}
          >
            {strings.common.save}
          </GlassButton>
          <GlassButton icon={ImageUp} onClick={() => avatarInput.current?.click()}>
            {strings.profile.avatarAction}
          </GlassButton>
          <GlassButton
            variant="ghost"
            icon={Trash2}
            disabled={user.avatarUrl === null || removeImage.isPending}
            onClick={() => removeImage.mutate("avatar")}
          >
            {strings.profile.avatarRemove}
          </GlassButton>
        </div>
      </GlassPanel>

      <GlassPanel className="profile-fields">
        <h2 className="title-3">{strings.profile.bannerTitle}</h2>
        <div className="banner-presets">
          {bannerPalette.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={[
                "banner-preset",
                user.bannerUrl === null && sameBannerStyle(user.bannerStyle, entry.style)
                  ? "is-active"
                  : null
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ background: presetBackground(entry.style) }}
              aria-label={strings.profile.bannerTitle}
              disabled={applyPreset.isPending}
              onClick={() => applyPreset.mutate(entry.style)}
            />
          ))}
        </div>
        <div className="profile-actions">
          <GlassButton icon={ImageUp} onClick={() => bannerInput.current?.click()}>
            {strings.profile.bannerUpload}
          </GlassButton>
          <GlassButton
            variant="ghost"
            icon={Trash2}
            disabled={user.bannerUrl === null || removeImage.isPending}
            onClick={() => removeImage.mutate("banner")}
          >
            {strings.profile.bannerRemove}
          </GlassButton>
        </div>
      </GlassPanel>

      <GlassPanel className="profile-actions">
        <GlassButton variant="danger" icon={LogOut} onClick={() => void signOut()}>
          {strings.profile.logout}
        </GlassButton>
      </GlassPanel>

      <input
        ref={avatarInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => {
          void pick("avatar", event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={bannerInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => {
          void pick("banner", event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {crop === null ? null : (
        <ImageCropper
          file={crop.file}
          kind={crop.target}
          title={crop.target === "banner" ? strings.profile.cropBanner : strings.profile.cropAvatar}
          onCancel={() => setCrop(null)}
          onApply={async (blob) => {
            try {
              await applyUpload.mutateAsync({ target: crop.target, blob });
            } catch {
              return;
            }
            setCrop(null);
          }}
        />
      )}
    </div>
  );
};
