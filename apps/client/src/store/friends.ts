import type { FriendListItem, FriendRequestItem, FriendsOverview } from "@koda/shared/friends";
import type { PublicUser } from "@koda/shared/profile";
import { create } from "zustand";
import { fetchFriends } from "../api/friends.js";
import { onSignOut } from "../api/http.js";
import { useWsStore } from "../ws/store.js";

type FriendsState = {
  overview: FriendsOverview | null;
  load: () => Promise<FriendsOverview>;
  requestReceived: (user: PublicUser) => void;
  requestCancelled: (user: PublicUser) => void;
  accepted: (user: PublicUser) => void;
  removed: (user: PublicUser) => void;
  clear: () => void;
};

const watchedIds = (overview: FriendsOverview): string[] => [
  ...overview.friends.map((item) => item.user.id),
  ...overview.incoming.map((item) => item.user.id),
  ...overview.outgoing.map((item) => item.user.id)
];

const withoutUser = <T extends { user: PublicUser }>(items: readonly T[], userId: string): T[] =>
  items.filter((item) => item.user.id !== userId);

const applyWatch = (overview: FriendsOverview): FriendsOverview => {
  useWsStore.getState().watch(watchedIds(overview));
  return overview;
};

export const useFriendsStore = create<FriendsState>()((set, get) => {
  const update = (transform: (current: FriendsOverview) => FriendsOverview): void => {
    const current = get().overview;
    if (current === null) {
      return;
    }
    set({ overview: applyWatch(transform(current)) });
  };

  return {
    overview: null,
    load: async () => {
      const overview = await fetchFriends();
      set({ overview: applyWatch(overview) });
      return overview;
    },
    requestReceived: (user) =>
      update((current) => {
        const incoming: FriendRequestItem[] = [
          { user, createdAt: new Date().toISOString() },
          ...withoutUser(current.incoming, user.id)
        ];
        return { ...current, incoming, incomingCount: incoming.length };
      }),
    requestCancelled: (user) =>
      update((current) => {
        const incoming = withoutUser(current.incoming, user.id);
        return { ...current, incoming, incomingCount: incoming.length };
      }),
    accepted: (user) =>
      update((current) => {
        const incoming = withoutUser(current.incoming, user.id);
        const friends: FriendListItem[] = [
          { user, friendsSince: new Date().toISOString() },
          ...withoutUser(current.friends, user.id)
        ];
        return {
          ...current,
          friends,
          incoming,
          outgoing: withoutUser(current.outgoing, user.id),
          incomingCount: incoming.length
        };
      }),
    removed: (user) =>
      update((current) => ({ ...current, friends: withoutUser(current.friends, user.id) })),
    clear: () => set({ overview: null })
  };
});

onSignOut(() => {
  useFriendsStore.getState().clear();
});
