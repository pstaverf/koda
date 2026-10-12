import type { FriendStateResult, FriendsOverview } from "@koda/shared/friends";
import { http } from "./http.js";

const userPath = (publicId: string): string => encodeURIComponent(publicId);

export const fetchFriends = (): Promise<FriendsOverview> => http.get<FriendsOverview>("/friends");

export const sendFriendRequest = (publicId: string): Promise<FriendStateResult> =>
  http.post<FriendStateResult>("/friends/requests", { publicId });

export const cancelFriendRequest = (publicId: string): Promise<null> =>
  http.delete<null>(`/friends/requests/${userPath(publicId)}`);

export const acceptFriendRequest = (publicId: string): Promise<FriendStateResult> =>
  http.post<FriendStateResult>(`/friends/requests/${userPath(publicId)}/accept`);

export const declineFriendRequest = (publicId: string): Promise<null> =>
  http.post<null>(`/friends/requests/${userPath(publicId)}/decline`);

export const removeFriend = (publicId: string): Promise<null> => http.delete<null>(`/friends/${userPath(publicId)}`);
