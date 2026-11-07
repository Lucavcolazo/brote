import { DEFAULT_AVATARS, normalizeAvatar, type AvatarConfig } from "./avatar/model";
import type { Profile } from "./api/types";

// Avatar inicial hasta que cada uno arme el suyo en Config.
export function avatarOf(p: Pick<Profile, "name" | "avatar"> | null | undefined): AvatarConfig {
  const fallback = p?.name.toLowerCase().startsWith("gio") ? DEFAULT_AVATARS.giovanna : DEFAULT_AVATARS.luca;
  return normalizeAvatar(p?.avatar, fallback);
}
