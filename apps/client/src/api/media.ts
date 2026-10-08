import type { AvatarResult, BannerResult } from "@koda/shared/profile";
import { toFormData, uploadFileName } from "../lib/files.js";
import { http } from "./http.js";

const uploadField = "file";

export const uploadAvatar = (blob: Blob): Promise<AvatarResult> =>
  http.post<AvatarResult>("/media/avatar", toFormData(uploadField, blob, uploadFileName(blob.type, "avatar")));

export const deleteAvatar = (): Promise<AvatarResult> => http.delete<AvatarResult>("/media/avatar");

export const uploadBanner = (blob: Blob): Promise<BannerResult> =>
  http.post<BannerResult>("/media/banner", toFormData(uploadField, blob, uploadFileName(blob.type, "banner")));

export const deleteBanner = (): Promise<BannerResult> => http.delete<BannerResult>("/media/banner");
