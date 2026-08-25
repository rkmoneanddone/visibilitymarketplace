import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Menu,
} from "lucide-react";

import {
  logout,
} from "../../services/auth/auth";

import {
  AuthDialog,
} from "./AuthDialog";

import {
  useAuth,
} from "./AuthProvider";

export function AccountControl() {
  const {
    firebaseUser,
    profile,
    initializing,
  } = useAuth();

  const navigate =
    useNavigate();

  const [authOpen, setAuthOpen] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const menuRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, [menuOpen]);

  if (initializing) {
    return (
      <span className="account-placeholder">
        Account
      </span>
    );
  }

  if (!firebaseUser) {
    return (
      <>
        <button
          type="button"
          className="account-link"
          onClick={() =>
            setAuthOpen(true)
          }
        >
          Sign in
        </button>

        <AuthDialog
          open={authOpen}
          onClose={() =>
            setAuthOpen(false)
          }
        />
      </>
    );
  }

  const displayName =
    profile?.displayName ||
    firebaseUser.displayName ||
    firebaseUser.email ||
    "Account";

  const email =
    profile?.email ||
    firebaseUser.email ||
    "";

  const initial =
    displayName
      .trim()
      .charAt(0)
      .toUpperCase() || "?";

  const roleLabel =
    profile?.role === "admin"
      ? "Admin"
      : profile?.role === "publisher"
        ? "Publisher"
        : "Supporter";

  return (
    <div
      className="account-menu-wrap"
      ref={menuRef}
    >
      <button
        type="button"
        className="account-trigger"
        aria-label="Account menu"
        aria-expanded={menuOpen}
        onClick={() =>
          setMenuOpen((current) => !current)
        }
      >
        <span className="account-avatar">
          {initial}
        </span>

        <Menu size={18} />
      </button>

      {menuOpen && (
        <div className="account-menu">
          <div className="account-menu-profile">
            <span className="account-menu-avatar">
              {initial}
            </span>

            <div>
              <strong>{displayName}</strong>

              {email && (
                <span>{email}</span>
              )}
            </div>
          </div>

          <div className="account-role">
            {roleLabel}
          </div>

          <div className="account-menu-divider" />

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              navigate("/dashboard");
            }}
          >
            My listings
          </button>

          <button
            type="button"
            disabled
          >
            My promotions
          </button>

          <button
            type="button"
            disabled
          >
            Payments
          </button>

          <div className="account-menu-divider" />

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              void logout();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}