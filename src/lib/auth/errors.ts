export function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error
      ? String(error.code)
      : "";

  switch (code) {
    case "auth/invalid-credential":
      return "Email or password is incorrect.";

    case "auth/email-already-in-use":
      return "An account already exists with this email.";

    case "auth/weak-password":
      return "Please choose a stronger password.";

    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";

    default:
      return "Unable to sign in right now. Please try again.";
  }
}