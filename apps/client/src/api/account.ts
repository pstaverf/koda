import type { ChangeEmailInput, ChangePasswordInput, ConfirmEmailInput, DeleteAccountInput } from "@koda/shared/auth";
import type { CurrentUser } from "@koda/shared/profile";
import { http, signOutLocally } from "./http.js";

export const changePassword = (input: ChangePasswordInput): Promise<null> =>
  http.post<null>("/account/password", input);

export const requestEmailChange = (input: ChangeEmailInput): Promise<null> =>
  http.post<null>("/account/email/request", input);

export const confirmEmailChange = (input: ConfirmEmailInput): Promise<CurrentUser> =>
  http.post<CurrentUser>("/account/email/confirm", input);

export const deleteAccount = async (input: DeleteAccountInput): Promise<void> => {
  await http.delete<null>("/account", input);
  signOutLocally(false);
};
