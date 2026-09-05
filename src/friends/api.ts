import { z } from "zod";
import { starredListSchema } from "../stars/api";
const relationship = z.enum(["incoming", "outgoing", "accepted"]);
const connection = z.object({
  id: z.string(),
  userId: z.string(),
  displayName: z.string(),
  relationship,
});
export const connectionsSchema = z.object({
  accepted: z.array(connection),
  incoming: z.array(connection),
  outgoing: z.array(connection),
});
export const profileSchema = z.object({
  profile: z.object({
    id: z.string(),
    displayName: z.string(),
    relationshipId: z.string().nullable(),
    relationship: z.enum(["self", "none", "incoming", "outgoing", "accepted"]),
  }),
});
const watchSchema = starredListSchema.extend({
  profile: z.object({ id: z.string(), displayName: z.string() }),
});
export type Connection = z.infer<typeof connection>;
export type FriendProfile = z.infer<typeof profileSchema>["profile"];
export interface FriendView {
  connections?: z.infer<typeof connectionsSchema>;
  profile?: FriendProfile;
  watchList?: z.infer<typeof watchSchema>;
}
export class FriendRequestError extends Error {
  constructor(public status: number) {
    super("Friend request failed");
  }
}
async function read(path: string, signal: AbortSignal) {
  const response = await fetch(`/api/friends${path}`, {
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) throw new FriendRequestError(response.status);
  return response.json();
}
export async function readView(
  target: string | undefined,
  signal: AbortSignal,
): Promise<FriendView> {
  if (!target)
    return { connections: connectionsSchema.parse(await read("", signal)) };
  const path = `/profiles/${encodeURIComponent(target)}`;
  const { profile } = profileSchema.parse(await read(path, signal));
  if (profile.id !== target) throw new Error("Unexpected profile");
  if (profile.relationship !== "accepted") return { profile };
  try {
    const watchList = watchSchema.parse(
      await read(path + "/watch-list", signal),
    );
    if (watchList.profile.id !== target)
      throw new Error("Unexpected watch list");
    return { profile, watchList };
  } catch (error) {
    if (!(error instanceof FriendRequestError) || error.status !== 404)
      throw error;
    const updated = profileSchema.parse(await read(path, signal)).profile;
    if (updated.id !== target || updated.relationship === "accepted")
      throw error;
    return { profile: updated };
  }
}
export async function changeFriend(path: string) {
  const response = await fetch(`/api/friends${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) throw new FriendRequestError(response.status);
}
