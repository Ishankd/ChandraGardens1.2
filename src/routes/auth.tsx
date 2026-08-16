import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import logo from "@/assets/Logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Chandra Gardens Nursery" },
      {
        name: "description",
        content:
          "Sign in or create your Chandra Gardens account to save plants to your cart and track nursery orders.",
      },
      { property: "og:title", content: "Sign in — Chandra Gardens" },
      { property: "og:description", content: "Access your Chandra Gardens plant orders and cart." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/cart" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/cart" });
      } else if (mode === "signup") {
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { full_name: fullName, phone },
          },
        });
        if (error) throw error;
        setNotice("Account created. Check your inbox if confirmation is required, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        setNotice("Password reset link sent to your email.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };


  const google = async () => {
    setError("");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/cart" });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-16">
      <div className="w-full max-w-md rounded-3xl glass p-8 shadow-[var(--shadow-soft)]">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <img src={logo} alt="Chandra Gardens" className="h-10 w-10 object-contain" />
          <span className="font-display text-lg font-semibold">
            Chandra <span className="gradient-text">Gardens</span>
          </span>
        </Link>

        <h1 className="text-center font-display text-3xl font-medium">
          {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {mode === "reset"
            ? "We'll email you a reset link."
            : "Save plants, checkout securely and track your orders."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "signup" && (
            <>
              <Field label="Full name" value={fullName} onChange={setFullName} required />
              <Field label="Phone" value={phone} onChange={setPhone} type="tel" />
            </>
          )}
          <Field label="Email" value={email} onChange={setEmail} type="email" required />
          {mode !== "reset" && (
            <Field label="Password" value={password} onChange={setPassword} type="password" required />
          )}
          {mode === "signup" && (
            <Field
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              type="password"
              required
            />
          )}


          {error && <p className="text-sm text-rose-600">{error}</p>}
          {notice && <p className="text-sm text-primary">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </button>
        </form>

        {mode !== "reset" && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>
            <button
              onClick={google}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background/60 py-3 text-sm font-semibold transition hover:bg-primary/5"
            >
              <i className="fa-brands fa-google" /> Continue with Google
            </button>
          </>
        )}

        <div className="mt-6 space-y-1 text-center text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>
              <p>
                New here?{" "}
                <button className="font-semibold text-primary" onClick={() => setMode("signup")}>
                  Create an account
                </button>
              </p>
              <p>
                <button className="text-primary" onClick={() => setMode("reset")}>
                  Forgot password?
                </button>
              </p>
            </>
          ) : (
            <button className="font-semibold text-primary" onClick={() => setMode("signin")}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}
