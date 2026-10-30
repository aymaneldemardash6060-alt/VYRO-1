import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LoaderCircle,
  Mail,
  ShieldCheck,
  UserRound,
  X
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { isSupabaseConfigured, supabase } from '../../lib/supabase.ts';

type AuthMode = 'signin' | 'signup' | 'reset' | 'update-password';

interface AuthDialogProps {
  onClose: () => void;
  initialMode?: AuthMode;
}

const inputClass =
  'h-12 w-full rounded-xl border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 ' +
  'transition-[border-color,box-shadow] duration-150 hover:border-stone-400 ' +
  'focus:border-stone-900 focus:outline-none focus:ring-4 focus:ring-stone-900/10 sm:text-sm';

/** Rough, UI-only strength hint. Real validation stays in handleSubmit / Supabase. */
function getPasswordStrength(value: string): 0 | 1 | 2 | 3 | 4 {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.max(1, Math.min(4, score)) as 1 | 2 | 3 | 4;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ onClose, initialMode = 'signin' }) => {
  const { language } = useLanguage();
  const { user, passwordRecoveryPending, clearPasswordRecovery } = useAuth();
  const isArabic = language === 'ar';
  const uid = useId();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (passwordRecoveryPending) {
      setMode('update-password');
      setError('');
      setNotice('');
    }
  }, [passwordRecoveryPending]);

  // Lock page scroll behind the dialog and close on Escape
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  // Put the cursor in the first field whenever the form changes
  useEffect(() => {
    const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [mode]);

  const copy = {
    heading:
      mode === 'signin'
        ? (isArabic ? 'مرحبًا بعودتك' : 'Welcome back')
        : mode === 'signup'
        ? (isArabic ? 'أنشئ حسابك في فايرو' : 'Create your VYRO account')
        : mode === 'reset'
        ? (isArabic ? 'استعادة كلمة المرور' : 'Reset your password')
        : (isArabic ? 'اختر كلمة مرور جديدة' : 'Choose a new password'),
    subtitle:
      mode === 'signin'
        ? (isArabic ? 'سجّل دخولك لمتابعة طلباتك وإتمام الشراء بسرعة.' : 'Sign in to follow your orders and check out faster.')
        : mode === 'signup'
        ? (isArabic ? 'حساب واحد لتتبع الطلبات وحفظ بياناتك.' : 'One account to track orders and save your details.')
        : mode === 'reset'
        ? (isArabic ? 'اكتب بريدك وسنرسل لك رابط إعادة التعيين.' : 'Enter your email and we will send you a reset link.')
        : (isArabic ? 'استخدم 8 أحرف على الأقل.' : 'Use at least 8 characters.'),
    tabsLabel: isArabic ? 'الدخول أو إنشاء حساب' : 'Sign in or create an account',
    signin: isArabic ? 'تسجيل الدخول' : 'Sign in',
    signup: isArabic ? 'إنشاء حساب' : 'Create account',
    reset: isArabic ? 'نسيت كلمة المرور؟' : 'Forgot password?',
    email: isArabic ? 'البريد الإلكتروني' : 'Email address',
    password: isArabic ? 'كلمة المرور' : 'Password',
    newPassword: isArabic ? 'كلمة المرور الجديدة' : 'New password',
    confirm: isArabic ? 'تأكيد كلمة المرور' : 'Confirm password',
    showPassword: isArabic ? 'إظهار كلمة المرور' : 'Show password',
    hidePassword: isArabic ? 'إخفاء كلمة المرور' : 'Hide password',
    submit: mode === 'signin' ? (isArabic ? 'دخول' : 'Sign in')
      : mode === 'signup' ? (isArabic ? 'إنشاء الحساب' : 'Create account')
      : mode === 'reset' ? (isArabic ? 'إرسال رابط الاستعادة' : 'Send reset link')
      : (isArabic ? 'حفظ كلمة المرور الجديدة' : 'Save new password'),
    close: isArabic ? 'إغلاق' : 'Close',
    configMissing: isArabic
      ? 'تسجيل الدخول غير مهيأ بعد. يلزم ضبط VITE_SUPABASE_URL وVITE_SUPABASE_PUBLISHABLE_KEY في إعدادات الاستضافة.'
      : 'Authentication is not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the hosting environment.',
    adminNotice: isArabic
      ? 'إنشاء الحساب لا يمنح صلاحية الإدارة. صلاحية المدير تُضاف يدويًا وبشكل آمن من Supabase.'
      : 'Creating an account does not grant admin access. Admin privileges are assigned securely in Supabase.',
    emailConfirmation: isArabic
      ? 'تم إنشاء الحساب. افحص بريدك لتأكيده قبل تسجيل الدخول.'
      : 'Account created. Check your email and confirm it before signing in.',
    resetSent: isArabic
      ? 'إذا كان البريد مسجلًا، فسيصلك رابط آمن لإعادة تعيين كلمة المرور.'
      : 'If the address is registered, a secure password-reset link will arrive by email.',
    passwordUpdated: isArabic ? 'تم تحديث كلمة المرور. يمكنك المتابعة.' : 'Password updated. You can continue.',
    passwordMismatch: isArabic ? 'كلمتا المرور غير متطابقتين.' : 'The passwords do not match.',
    passwordShort: isArabic ? 'استخدم كلمة مرور من 8 أحرف على الأقل.' : 'Use a password with at least 8 characters.',
    back: isArabic ? 'رجوع لتسجيل الدخول' : 'Back to sign in',
    strength: [
      '',
      isArabic ? 'ضعيفة' : 'Weak',
      isArabic ? 'مقبولة' : 'Fair',
      isArabic ? 'جيدة' : 'Good',
      isArabic ? 'قوية' : 'Strong'
    ]
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!supabase || !isSupabaseConfigured) {
      setError(copy.configMissing);
      return;
    }
    if ((mode === 'signup' || mode === 'update-password') && password.length < 8) {
      setError(copy.passwordShort);
      return;
    }
    if ((mode === 'signup' || mode === 'update-password') && password !== confirmPassword) {
      setError(copy.passwordMismatch);
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        onClose();
      } else if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin }
        });
        if (authError) throw authError;
        if (data.session) onClose();
        else setNotice(copy.emailConfirmation);
      } else if (mode === 'reset') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin
        });
        if (authError) throw authError;
        setNotice(copy.resetSent);
      } else {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        clearPasswordRecovery();
        setNotice(copy.passwordUpdated);
        setPassword('');
        setConfirmPassword('');
        setMode('signin');
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : (isArabic ? 'تعذر إكمال العملية.' : 'The request could not be completed.'));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError('');
    setNotice('');
    setShowPassword(false);
    setConfirmPassword('');
    if (next === 'signin') clearPasswordRecovery();
  };

  const direction = isArabic ? 'rtl' : 'ltr';
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;
  const HeaderIcon = mode === 'update-password' ? KeyRound : mode === 'signup' ? UserRound : mode === 'reset' ? Mail : ShieldCheck;
  const showTabs = mode === 'signin' || mode === 'signup';
  const needsConfirm = mode === 'signup' || mode === 'update-password';
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthColors = ['bg-stone-200', 'bg-rose-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-600'];
  const ids = {
    title: `${uid}-title`,
    email: `${uid}-email`,
    password: `${uid}-password`,
    confirm: `${uid}-confirm`
  };

  const dialog = (
    <div
      className="vyro-backdrop fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto overscroll-contain bg-stone-950/60 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={ids.title}
        dir={direction}
        className="animate-in slide-in-from-bottom relative flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-stone-900/5 sm:max-h-[calc(100dvh-3rem)] sm:max-w-[27rem] sm:rounded-3xl"
      >
        {/* Brand header */}
        <div className="relative shrink-0 overflow-hidden bg-stone-950 px-6 pb-7 pt-6 text-white sm:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(#e7e5e4_1px,transparent_1px)] [background-size:16px_16px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -end-16 h-44 w-44 rounded-full bg-amber-500/20 blur-3xl"
          />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-lg font-black text-stone-950">
                V
              </span>
              <span className="text-lg font-black tracking-wider">VYRO</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={copy.close}
              className="-me-2 flex h-9 w-9 items-center justify-center rounded-full text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative mt-6 flex items-start gap-3.5">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-amber-300">
              <HeaderIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id={ids.title} className="text-xl font-extrabold leading-snug sm:text-2xl">
                {copy.heading}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-300">{copy.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Scrollable form area */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-8 sm:pb-8 sm:pt-6">
          {showTabs && (
            <div
              role="tablist"
              aria-label={copy.tabsLabel}
              className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1"
            >
              {(['signin', 'signup'] as const).map((tab) => {
                const active = mode === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => switchMode(tab)}
                    className={`h-10 rounded-lg text-sm font-bold transition-all ${
                      active
                        ? 'bg-white text-stone-950 shadow-sm ring-1 ring-stone-900/5'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    {tab === 'signin' ? copy.signin : copy.signup}
                  </button>
                );
              })}
            </div>
          )}

          {(mode === 'reset' || mode === 'update-password') && (
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="-ms-1 mb-4 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-semibold text-stone-600 transition-colors hover:text-stone-950"
            >
              <BackIcon className="h-4 w-4" />
              {copy.back}
            </button>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode !== 'update-password' && (
              <div className="space-y-1.5">
                <label htmlFor={ids.email} className="block text-sm font-bold text-stone-800">
                  {copy.email}
                </label>
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-400"
                  />
                  <input
                    ref={firstFieldRef}
                    id={ids.email}
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={`${inputClass} ps-11 pe-3`}
                    placeholder="name@example.com"
                  />
                </div>
              </div>
            )}

            {mode !== 'reset' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor={ids.password} className="block text-sm font-bold text-stone-800">
                    {mode === 'update-password' ? copy.newPassword : copy.password}
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="rounded text-xs font-semibold text-stone-500 underline-offset-4 transition-colors hover:text-stone-950 hover:underline"
                    >
                      {copy.reset}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock
                    aria-hidden="true"
                    className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-400"
                  />
                  <input
                    ref={mode === 'update-password' ? firstFieldRef : undefined}
                    id={ids.password}
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={mode === 'signin' ? 1 : 8}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={`${inputClass} ps-11 pe-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                    aria-pressed={showPassword}
                    className="absolute end-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>

                {needsConfirm && password.length > 0 && (
                  <div className="flex items-center gap-3 pt-1" aria-live="polite">
                    <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
                      {[1, 2, 3, 4].map((step) => (
                        <span
                          key={step}
                          className={`h-1 rounded-full transition-colors duration-200 ${
                            strength >= step ? strengthColors[strength] : 'bg-stone-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="w-14 shrink-0 text-xs font-semibold text-stone-500">{copy.strength[strength]}</span>
                  </div>
                )}
              </div>
            )}

            {needsConfirm && (
              <div className="space-y-1.5">
                <label htmlFor={ids.confirm} className="block text-sm font-bold text-stone-800">
                  {copy.confirm}
                </label>
                <div className="relative">
                  <Lock
                    aria-hidden="true"
                    className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-400"
                  />
                  <input
                    id={ids.confirm}
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={`${inputClass} ps-11 pe-3`}
                  />
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-relaxed text-rose-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 break-words">{error}</span>
              </div>
            )}
            {notice && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm leading-relaxed text-emerald-800"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 break-words">{notice}</span>
              </div>
            )}
            {!isSupabaseConfigured && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-3 text-xs leading-relaxed text-stone-600"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                <span className="min-w-0 break-words">{copy.configMissing}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !isSupabaseConfigured}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 text-sm font-extrabold text-white shadow-sm transition-all hover:bg-stone-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
            >
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {copy.submit}
            </button>

            {mode === 'signup' && (
              <p className="flex items-start gap-2 text-xs leading-relaxed text-stone-500">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
                <span>{copy.adminNotice}</span>
              </p>
            )}
          </form>
        </div>
      </section>
    </div>
  );

  // Rendered into <body>: the header uses backdrop-filter, which turns it into the
  // containing block for `position: fixed` children and trapped this dialog inside it.
  return createPortal(dialog, document.body);
};
