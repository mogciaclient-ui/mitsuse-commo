export type VerifiedLineProfile = {
  sub: string;
  name?: string;
  picture?: string;
  aud?: string;
};

export async function verifyLineIdToken(idToken: string): Promise<VerifiedLineProfile | null> {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!idToken || !channelId) return null;

  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
    cache: "no-store",
  });
  if (!response.ok) return null;

  const profile = await response.json() as Partial<VerifiedLineProfile>;
  if (!profile.sub || profile.aud !== channelId) return null;
  return profile as VerifiedLineProfile;
}
