"use client";

import { useEffect, useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, Eye, EyeOff, Lock, Mail, Scissors, Upload, User } from "lucide-react";
import { BRAND } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { friendlyAuthError, signInWithEmail, signInWithGoogle, signUpWithEmail } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import { GoogleIcon, Logo, YouTubeIcon } from "@/components/ui/brand-icons";
import { SAMPLE_CREDIT, SampleShort, type SampleClip } from "@/components/ui/sample-short";
import { cn } from "@/lib/cn";

type Mode = "signin" | "signup";

type Frame = { tilt: string; delay: string; clip: SampleClip; time: string; title: string };

const FRAMES: Frame[] = [
  { tilt: "-6deg", delay: "0s", clip: "butterfly", time: "00:58", title: "Nobody expected this 😱" },
  { tilt: "4deg", delay: "-2.5s", clip: "dragon", time: "00:45", title: "Part 07 — The twist" },
  { tilt: "-2deg", delay: "-4.5s", clip: "squirrel", time: "01:00", title: "Watch till the end" },
];

const STEPS = [
  { icon: Upload, label: "Upload once" },
  { icon: Scissors, label: "Auto-cut Shorts" },
  { icon: CalendarClock, label: "Schedule" },
  { icon: null, label: "Publish to YouTube" },
];

function ShowcaseFrame({ frame, index }: { frame: Frame; index: number }) {
  const bar = useRef<HTMLDivElement>(null);
  return (
    <div
      style={{ ["--tilt" as string]: frame.tilt, animationDelay: frame.delay }}
      className={cn(
        "relative aspect-[9/16] w-[150px] animate-float overflow-hidden rounded-2xl border border-white/10 bg-surface-2 shadow-2xl shadow-black/60 xl:w-[170px]",
        index === 1 && "mt-16",
      )}
    >
      <SampleShort clip={frame.clip} progressRef={bar} />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
      <span className="absolute right-2 top-2 rounded-md bg-black/50 px-1.5 py-0.5 font-mono text-[10px] text-white/80 backdrop-blur">{frame.time}</span>
      <div className="absolute inset-x-3 bottom-3">
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/20">
          <div ref={bar} className="h-full rounded-full bg-accent" style={{ width: `${40 + index * 22}%` }} />
        </div>
        <p className="text-[11px] font-medium leading-tight text-white drop-shadow">{frame.title}</p>
      </div>
    </div>
  );
}

function Showcase() {
  return (
    <div className="relative hidden overflow-hidden border-r border-line bg-[radial-gradient(120%_80%_at_20%_0%,#1d1440_0%,#0b0a12_55%,#08080a_100%)] lg:flex lg:flex-col">
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

      <div className="relative px-12 pt-10">
        <Logo />
      </div>

      <div className="relative flex flex-1 items-center justify-center gap-6 px-12">
        {FRAMES.map((f, i) => (
          <ShowcaseFrame key={f.clip} frame={f} index={i} />
        ))}
      </div>

      <div className="relative px-12 pb-12">
        <h2 className="max-w-md text-[34px] font-semibold leading-[1.1] tracking-tight">
          Your content.
          <br />
          <span className="bg-gradient-to-r from-[#c9bbff] to-accent bg-clip-text text-transparent">Automatically turned into Shorts.</span>
        </h2>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {STEPS.map(({ icon: Icon, label }, i) => (
            <span key={label} className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/75">
                {Icon ? <Icon className="size-3.5 text-accent" /> : <YouTubeIcon className="size-3.5" />}
                {label}
              </span>
              {i < STEPS.length - 1 && <ArrowRight className="size-3.5 text-white/25" />}
            </span>
          ))}
        </div>
        <p className="mt-8 text-[10.5px] text-white/30">{SAMPLE_CREDIT}</p>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  trailing,
  ...props
}: ComponentProps<"input"> & { icon: typeof Mail; trailing?: ReactNode }) {
  return (
    <label className="group flex h-11 items-center gap-2.5 rounded-xl border border-line-strong bg-surface-2/70 px-3.5 transition focus-within:border-accent/60 focus-within:bg-surface-2 focus-within:shadow-[0_0_0_4px_var(--accent-soft)]">
      <Icon className="size-4 text-faint group-focus-within:text-accent" />
      <input className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-faint" {...props} />
      {trailing}
    </label>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function run(kind: "google" | "email", action: () => Promise<unknown>) {
    setBusy(kind);
    setError(null);
    try {
      await action();
      router.replace("/dashboard");
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(null);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "signup" && password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    void run("email", () => (mode === "signin" ? signInWithEmail(email, password) : signUpWithEmail(email, password, name.trim())));
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <Showcase />

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-[380px] animate-enter">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1.5 text-sm text-muted">
            {mode === "signin" ? `Sign in to ${BRAND.name} to manage your Shorts.` : BRAND.tagline}
          </p>

          <Button
            variant="secondary"
            size="lg"
            className="mt-8 w-full"
            loading={busy === "google"}
            disabled={busy !== null}
            icon={<GoogleIcon className="size-[18px]" />}
            onClick={() => run("google", signInWithGoogle)}
          >
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
            <span className="h-px flex-1 bg-line" />
            or with email
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <Field icon={User} placeholder="Your name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <Field icon={Mail} type="email" placeholder="you@example.com" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field
              icon={Lock}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              trailing={
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-faint hover:text-text" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
            />

            {error && (
              <p role="alert" className="animate-enter rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" loading={busy === "email"} disabled={busy !== null}>
              {mode === "signin" ? "Sign in" : "Create account"}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-[13px] text-muted">
            {mode === "signin" ? "New to " + BRAND.name + "?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="font-medium text-accent hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
