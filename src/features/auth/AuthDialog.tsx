import {
  useState,
  type FormEvent,
} from "react";

import {
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
} from "../../services/auth/auth";

import {
  getAuthErrorMessage,
} from "../../lib/auth/errors";


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
    useState<"signin" | "register">("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

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

  return (
    <div
      className="auth-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
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
        aria-label="Sign in"
      >
        <div className="auth-dialog-header">
          <div>
            <p className="eyebrow">
              YOUR ACCOUNT
            </p>

            <h2>
              {mode === "signin"
                ? "Sign in"
                : "Create account"}
            </h2>
          </div>

          <button
            type="button"
            className="auth-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <button
          type="button"
          className="auth-google"
          onClick={handleGoogle}
          disabled={submitting}
        >
          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete={
                mode === "register"
                  ? "new-password"
                  : "current-password"
              }
              minLength={6}
              required
            />
          </label>

          {error && (
            <p className="auth-error">
              {error}
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

        <button
          type="button"
          className="auth-mode-switch"
          disabled={submitting}
          onClick={() => {
            setError(null);

            setMode((current) =>
              current === "signin"
                ? "register"
                : "signin",
            );
          }}
        >
          {mode === "signin"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </section>
    </div>
  );
}