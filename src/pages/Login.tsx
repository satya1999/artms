import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BrandMark, BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

const DEMO_ACCOUNTS = [
  { email: "admin@artms.in", label: "Super Admin" },
  { email: "accounts@artms.in", label: "Accountant" },
  { email: "booking@artms.in", label: "Booking Executive" },
  { email: "tours@artms.in", label: "Tour Manager" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Session is restored asynchronously after a hard refresh; once it hydrates,
  // send an already-authenticated user back to the app instead of stranding
  // them on the login screen.
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const ok = login(email, password);
    if (ok) {
      navigate("/dashboard");
    } else {
      setError("Invalid credentials. Please check your email and password.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2 bg-white">
      {/* ── Brand panel (hidden on small screens) ── */}
      <div className="relative hidden lg:flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#2a0a08] via-[#1a1a1a] to-black text-white p-12">
        <div className="absolute -inset-40 brand-halo opacity-80" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <BrandMark className="h-56 w-56 drop-shadow-2xl" petals glow />
          <h2 className="mt-8 text-3xl font-extrabold tracking-tight">
            <span className="text-brand">Ananda</span> <span className="text-white">Rath</span>
          </h2>
          <p className="mt-2 max-w-xs text-sm text-slate-300">
            Travel Management System — run trips, bookings, payments, fleet and
            accounts from one blessed dashboard.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6 text-center">
            {[
              { k: "13", v: "Modules" },
              { k: "Real-time", v: "Cloud Sync" },
              { k: "Secure", v: "Role Access" },
            ].map((s) => (
              <div key={s.v}>
                <p className="text-lg font-bold text-brand-gold">{s.k}</p>
                <p className="text-xs text-slate-400">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="mb-8 flex flex-col items-center lg:items-start">
            <div className="lg:hidden">
              <BrandMark className="h-20 w-20" petals glow />
            </div>
            <div className="mt-4 lg:mt-0">
              <BrandLogo size="lg" subtitle="Travel Management System" />
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to continue to your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@artms.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 rounded-xl border bg-muted/40 p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Demo accounts · password <code className="text-brand font-bold">artms@2026</code>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => { setEmail(a.email); setPassword("artms@2026"); setError(""); }}
                  className="text-left rounded-lg px-2.5 py-1.5 text-xs hover:bg-background border border-transparent hover:border-border transition-colors"
                >
                  <span className="block font-medium text-foreground">{a.label}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">{a.email}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Ananda Rath Voyages · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
