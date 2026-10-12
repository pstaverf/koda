import type { PrivacySettings, UpdatePrivacyInput } from "@koda/shared/privacy";
import { http } from "./http.js";

export const fetchPrivacy = (): Promise<PrivacySettings> => http.get<PrivacySettings>("/privacy");

export const updatePrivacy = (input: UpdatePrivacyInput): Promise<PrivacySettings> =>
  http.patch<PrivacySettings>("/privacy", input);
