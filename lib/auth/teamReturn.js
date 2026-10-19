// A navigation hint only. Authentication and Ascent membership are checked separately.
export const TEAM_RETURN_COOKIE = "stockedby-signin-return";
export const TEAM_RETURN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 3600,
};

export function teamReturnPath(value, failed = false) {
  if (value === "/ascent#view=account") return failed ? "/ascent?authError=1#view=account" : value;
  const path = value === "/ascent" ? "/ascent" : "/workspace";
  return failed ? `${path}?authError=1` : path;
}
