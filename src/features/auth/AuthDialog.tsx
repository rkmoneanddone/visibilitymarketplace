import {
  useState,
  type FormEvent,
} from "react";

import {
  registerWithEmail,
  requestPasswordReset,
  signInWithEmail,
  signInWithGoogle,
} from "../../services/auth/auth";

import {
  getAuthErrorMessage,
} from "../../lib/auth/errors";

import {
  siteConfig,
} from "../../config/site";
import "./auth.css";

type AuthDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AuthDialog({
  open,
  onClose,
}: AuthDialogProps) {
  const [mode, setMode] =
    useState<"signin" | "register">(
      "signin",
    );

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [notice, setNotice] =
    useState<string | null>(
      null,
    );

  if (!open) {
    return null;
  }

  async function handleGoogle() {
    if (submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setNotice(null);

      await signInWithGoogle();

      onClose();
    } catch (error) {
      setError(
        getAuthErrorMessage(error),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setNotice(null);

      if (mode === "register") {
        await registerWithEmail(
          email.trim(),
          password,
        );
      } else {
        await signInWithEmail(
          email.trim(),
          password,
        );
      }

      onClose();
    } catch (error) {
      setError(
        getAuthErrorMessage(error),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    const cleanEmail =
      email.trim();

    if (!cleanEmail) {
      setNotice(null);
      setError(
        "Enter your email first, then choose Forgot password.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setNotice(null);

      await requestPasswordReset(
        cleanEmail,
      );

      setNotice(
        "Password reset email sent. Check your inbox.",
      );
    } catch (error) {
      setError(
        getAuthErrorMessage(error),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="auth-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <section
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "signin"
            ? "Sign in"
            : "Create account"
        }
      >
        <div className="auth-dialog-header">
          <div>
            <p className="auth-kicker">
              YOUR ACCOUNT
            </p>

            <h2>
              {mode === "signin"
                ? "Welcome back"
                : "Create account"}
            </h2>

            <p className="auth-subtitle">
              {mode === "signin"
                ? "Sign in to manage listings and Boards."
                : `Create your ${siteConfig.name} account.`}
            </p>
          </div>

          <button
            type="button"
            className="auth-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            {"\u00D7"}
          </button>
        </div>

        <button
          type="button"
          className="auth-google"
          onClick={handleGoogle}
          disabled={submitting}
        >
          <span
            className="auth-google-mark"
            aria-hidden="true"
          >
            G
          </span>

          Continue with Google
        </button>

        <div className="auth-divider">
          <span>
            or continue with email
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            <span>Email</span>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            <span className="auth-password-label">
              <span>Password</span>

              {mode === "signin" && (
                <button
                  type="button"
                  className="auth-forgot"
                  onClick={() =>
                    void handleForgotPassword()
                  }
                  disabled={submitting}
                >
                  Forgot password?
                </button>
              )}
            </span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              autoComplete={
                mode === "register"
                  ? "new-password"
                  : "current-password"
              }
              placeholder="********"
              minLength={6}
              required
            />
          </label>

          {error && (
            <p className="auth-error">
              {error}
            </p>
          )}

          {notice && (
            <p className="auth-notice">
              {notice}
            </p>
          )}

          <button
            type="submit"
            className="auth-primary"
            disabled={submitting}
          >
            {submitting
              ? "Please wait..."
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="auth-switch-row">
          <span>
            {mode === "signin"
              ? `New to ${siteConfig.name}?`
              : "Already have an account?"}
          </span>

          <button
            type="button"
            className="auth-mode-switch"
            disabled={submitting}
            onClick={() => {
              setError(null);
              setNotice(null);

              setMode(
                (current) =>
                  current === "signin"
                    ? "register"
                    : "signin",
              );
            }}
          >
            {mode === "signin"
              ? "Create account"
              : "Sign in"}
          </button>
        </div>
      </section>
    </div>
  );
}