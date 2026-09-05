// The server owns all credentials and sessions through Better Auth. This small
// transport only submits its documented JSON endpoints; cookies stay HttpOnly.
async function post(path: string, body: object = {}) {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.ok) return { error: null };
  return {
    error: {
      code: response.status === 429 ? "TOO_MANY_REQUESTS" : "REQUEST_FAILED",
    },
  };
}
export const authClient = {
  signUp: {
    email: (body: {
      name: string;
      email: string;
      password: string;
      callbackURL: string;
    }) => post("sign-up/email", body),
  },
  signIn: {
    email: (body: { email: string; password: string }) =>
      post("sign-in/email", body),
  },
  signOut: () => post("sign-out"),
  sendVerificationEmail: (body: { email: string; callbackURL: string }) =>
    post("send-verification-email", body),
  requestPasswordReset: (body: { email: string; redirectTo: string }) =>
    post("request-password-reset", body),
  resetPassword: (body: { token: string; newPassword: string }) =>
    post("reset-password", body),
  updateUser: (body: { name: string }) => post("update-user", body),
  changePassword: (body: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions: boolean;
  }) => post("change-password", body),
  revokeOtherSessions: () => post("revoke-other-sessions"),
};
export function returnPath(value: string | null): string {
  return value &&
    (["/releases", "/starred", "/friends"].includes(value) ||
      /^\/friends\/[a-zA-Z0-9_-]{1,128}$/.test(value))
    ? value
    : "/releases";
}
