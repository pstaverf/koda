import type { BlocksOverview } from "@koda/shared/friends";
import { http } from "./http.js";

export const fetchBlocks = (): Promise<BlocksOverview> => http.get<BlocksOverview>("/blocks");

export const blockUser = (publicId: string): Promise<null> => http.post<null>("/blocks", { publicId });

export const unblockUser = (publicId: string): Promise<null> =>
  http.delete<null>(`/blocks/${encodeURIComponent(publicId)}`);
