import type { CurrentUser, ProfileView, UpdateProfileInput } from "@koda/shared/profile";
import { http } from "./http.js";

export const fetchOwnProfile = (): Promise<CurrentUser> => http.get<CurrentUser>("/profile");

export const updateOwnProfile = (input: UpdateProfileInput): Promise<CurrentUser> =>
  http.patch<CurrentUser>("/profile", input);

export const fetchUserProfile = (publicId: string): Promise<ProfileView> =>
  http.get<ProfileView>(`/users/${encodeURIComponent(publicId)}`);
