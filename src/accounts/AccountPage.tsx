import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authClient, returnPath } from "./client";
import { useAccount } from "./context";
type Mode =
  | "login"
  | "signup"
  | "verify-email"
  | "forgot-password"
  | "reset-password"
  | "account";
const titles: Record<Mode, string> = {
  login: "Sign in",
  signup: "Create account",
  "verify-email": "Verify your email",
  "forgot-password": "Forgot your password?",
  "reset-password": "Reset password",
  account: "Account",
};
export function AccountPage({ mode }: { mode: Mode }) {
  const location = useLocation(),
    navigate = useNavigate();
  const { user, loading, refresh } = useAccount();
  const [email, setEmail] = useState(
    (location.state as { email?: string } | null)?.email ?? "",
  );
  const [name, setName] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const query = new URLSearchParams(location.search);
  const next = returnPath(query.get("returnTo"));
  const authLink = (path: string) =>
    `${path}?returnTo=${encodeURIComponent(next)}`;
  const verificationReturn = `/login?verified=1&returnTo=${encodeURIComponent(next)}`;
  const [token] = useState(query.get("token") ?? "");
  useEffect(() => {
    if (mode === "reset-password" && location.search)
      navigate("/reset-password", { replace: true });
  }, [mode, location.search, navigate]);
  const verified = query.get("verified") === "1" && !query.has("error");
  async function run(
    action: () => Promise<{
      error?: { message?: string; code?: string } | null;
    }>,
    success: () => void | Promise<void>,
    fallback: string,
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await action();
      if (result.error) {
        setError(
          result.error.code === "TOO_MANY_REQUESTS"
            ? "Please wait a minute before trying again."
            : fallback,
        );
        return;
      }
      await success();
    } catch {
      setError("We couldn’t connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "signup")
      void run(
        () =>
          authClient.signUp.email({
            name: name ?? "",
            email,
            password,
            callbackURL: verificationReturn,
          }),
        () => {
          setPassword("");
          navigate(authLink("/verify-email"), { state: { email } });
        },
        "We couldn’t create the account. Check your details and try again.",
      );
    if (mode === "login")
      void run(
        () => authClient.signIn.email({ email, password }),
        async () => {
          setPassword("");
          await refresh();
          navigate(next);
        },
        "Check your email and password, and make sure your email is verified.",
      );
    if (mode === "verify-email")
      void run(
        () =>
          authClient.sendVerificationEmail({
            email,
            callbackURL: verificationReturn,
          }),
        () =>
          setNotice(
            "If this address needs verification, an email will arrive shortly. Allow a minute before requesting another.",
          ),
        "We couldn’t send the email. Please wait a minute and try again.",
      );
    if (mode === "forgot-password")
      void run(
        () =>
          authClient.requestPasswordReset({
            email,
            redirectTo: "/reset-password",
          }),
        () =>
          setNotice(
            "If there’s an account for this address, a reset link will arrive shortly. Check your spam folder too.",
          ),
        "We couldn’t request a reset. Please wait a minute and try again.",
      );
    if (mode === "reset-password")
      void run(
        () => authClient.resetPassword({ newPassword: password, token }),
        async () => {
          setPassword("");
          await refresh();
          setNotice("Password updated. Please sign in again.");
        },
        "This reset link is invalid or expired. Request a new link.",
      );
    if (mode === "account")
      void run(
        () => authClient.updateUser({ name: name ?? user?.displayName ?? "" }),
        async () => {
          await refresh();
          setNotice("Display name updated.");
        },
        "We couldn’t update your name. Please sign in again and retry.",
      );
  }
  if (mode === "account" && loading)
    return (
      <section className="account-page" role="status">
        Loading your account…
      </section>
    );
  if (mode === "account" && !user)
    return (
      <section className="account-page">
        <h1 className="page-heading">Account</h1>
        <p>Please sign in to manage your account.</p>
        <Link className="action-button" to="/login">
          Sign in
        </Link>
      </section>
    );
  const showEmail = [
    "login",
    "signup",
    "verify-email",
    "forgot-password",
  ].includes(mode);
  const showPassword = ["login", "signup", "reset-password"].includes(mode);
  const invalidReset = mode === "reset-password" && !token;
  return (
    <section className="account-page" aria-labelledby="account-title">
      <h1 className="page-heading" id="account-title">
        {titles[mode]}
      </h1>
      {mode === "signup" && (
        <p>A few details, then we’ll send a link to verify your email.</p>
      )}
      {mode === "verify-email" && (
        <p>
          Follow the verification link in your email, then sign in. Check your
          spam folder, or request another link below.
        </p>
      )}
      {mode === "forgot-password" && (
        <p>We’ll email you a link to choose a new password.</p>
      )}
      {verified && (
        <p role="status" className="account-notice">
          Email verified. You can now sign in.
        </p>
      )}
      {query.has("error") && mode === "login" && (
        <p role="alert" className="account-error">
          The verification link is invalid or expired.{" "}
          <Link to={authLink("/verify-email")}>Request another</Link>.
        </p>
      )}
      {error && (
        <p role="alert" className="account-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="account-notice">
          {notice}
        </p>
      )}
      {invalidReset ? (
        <p>
          This link is missing or has expired.{" "}
          <Link to="/forgot-password">Request a new reset link</Link>.
        </p>
      ) : (
        !(mode === "reset-password" && notice) && (
          <form onSubmit={submit} className="account-form">
            {(mode === "signup" || mode === "account") && (
              <label>
                Display name
                <input
                  required
                  name="name"
                  autoComplete="nickname"
                  maxLength={60}
                  value={
                    name ??
                    (mode === "account" ? (user?.displayName ?? "") : "")
                  }
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            {showEmail && (
              <label>
                Email
                <input
                  required
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            )}
            {showPassword && (
              <label>
                <span id="account-password-label">
                  {mode === "reset-password" ? "New password" : "Password"}
                </span>
                <input
                  required
                  type="password"
                  name="password"
                  aria-labelledby="account-password-label"
                  aria-describedby={
                    mode === "login" ? undefined : "password-hint"
                  }
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={mode === "login" ? 1 : 12}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {mode !== "login" && (
                  <span className="field-hint" id="password-hint">
                    At least 12 characters. Password managers are welcome.
                  </span>
                )}
              </label>
            )}
            <button className="action-button" disabled={busy} type="submit">
              {busy
                ? "Please wait…"
                : {
                    login: "Sign in",
                    signup: "Create account",
                    "verify-email": "Resend verification email",
                    "forgot-password": "Send reset link",
                    "reset-password": "Set new password",
                    account: "Save display name",
                  }[mode]}
            </button>
          </form>
        )
      )}
      {mode === "login" && (
        <div className="account-help">
          <Link to="/forgot-password">Forgot password?</Link>
          <Link to={authLink("/verify-email")}>Verify your email</Link>
          <Link to={authLink("/signup")}>Create an account</Link>
        </div>
      )}
      {mode !== "login" && mode !== "account" && (
        <p className="account-help">
          <Link to={authLink("/login")}>Back to sign in</Link>
        </p>
      )}
      {mode === "account" && (
        <>
          <form
            className="account-form account-password"
            onSubmit={(event) => {
              event.preventDefault();
              void run(
                () =>
                  authClient.changePassword({
                    currentPassword,
                    newPassword: password,
                    revokeOtherSessions: true,
                  }),
                () => {
                  setPassword("");
                  setCurrentPassword("");
                  setNotice(
                    "Password changed. Other sessions have been signed out.",
                  );
                },
                "Check your current password. You may need to sign in again before changing it.",
              );
            }}
          >
            <h2>Change password</h2>
            <label>
              Current password
              <input
                required
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            <label>
              New password
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="action-button" disabled={busy}>
              Change password
            </button>
          </form>
          <div className="account-help">
            <button
              className="action-button"
              disabled={busy}
              onClick={() =>
                void run(
                  () => authClient.revokeOtherSessions(),
                  () => setNotice("Other sessions have been signed out."),
                  "Please sign in again and retry.",
                )
              }
            >
              Sign out other devices
            </button>
            <button
              className="action-button"
              disabled={busy}
              onClick={() =>
                void run(
                  () => authClient.signOut(),
                  async () => {
                    await refresh();
                    navigate("/releases");
                  },
                  "We couldn’t sign you out. Please try again.",
                )
              }
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </section>
  );
}
