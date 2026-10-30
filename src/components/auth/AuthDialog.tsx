import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, KeyRound, LoaderCircle, Mail, ShieldCheck, UserRound, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { isSupabaseConfigured, supabase } from '../../lib/supabase.ts';

type AuthMode = 'signin' | 'signup' | 'reset' | 'update-password';

interface AuthDialogProps {
  onClose: () => void;
  initialMode?: AuthMode;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ onClose, initialMode = 'signin' }) => {
  const { language } = useLanguage();
  const { user, passwordRecoveryPending, clearPasswordRecovery } = useAuth();
  const isArabic = language === 'ar';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (passwordRecoveryPending) {
      setMode('update-password');
      setError('');
      setNotice('');
    }
  }, [passwordRecoveryPending]);

  const copy = {
    title: isArabic ? 'حساب فايرو' : 'VYRO account',
    subtitle: isArabic ? 'سجّل دخولك أو أنشئ حسابًا للمتابعة.' : 'Sign in or create an account to continue.',
    signin: isArabic ? 'تسجيل الدخول' : 'Sign in',
    signup: isArabic ? 'إنشاء حساب' : 'Create account',
    reset: isArabic ? 'نسيت كلمة المرور؟' : 'Forgot password?',
    email: isArabic ? 'البريد الإلكتروني' : 'Email address',
    password: isArabic ? 'كلمة المرور' : 'Password',
    confirm: isArabic ? 'تأكيد كلمة المرور' : 'Confirm password',
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
    back: isArabic ? 'رجوع' : 'Back',
    switchSignup: isArabic ? 'ليس لديك حساب؟ أنشئ حسابًا' : 'New here? Create an account',
    switchSignin: isArabic ? 'لديك حساب بالفعل؟ سجّل الدخول' : 'Already have an account? Sign in'
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
        setPasswordRecoveryPendingFalse();
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

  const setPasswordRecoveryPendingFalse = () => clearPasswordRecovery();
  const direction = isArabic ? 'rtl' : 'ltr';
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-stone-950/60 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="vyro-auth-title"
        dir={direction}
        className="relative my-auto w-full max-w-md shrink-0 overflow-y-auto overscroll-contain rounded-3xl border border-stone-200 bg-white shadow-2xl"
        style={{ maxHeight: 'calc(100dvh - 2rem)' }}
      >
        <button type="button" onClick={onClose} aria-label={copy.close} className="absolute end-4 top-4 z-10 rounded-full bg-white/90 p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900">
          <X className="h-4 w-4" />
        </button>

        <div className="bg-stone-950 px-7 pb-6 pt-8 text-white">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-stone-950">
            {mode === 'update-password' ? <KeyRound className="h-5 w-5" /> : mode === 'signup' ? <UserRound className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <h2 id="vyro-auth-title" className="text-2xl font-black">{copy.title}</h2>
          <p className="mt-1 max-w-sm text-sm text-stone-300">{copy.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-7 py-6">
          {mode !== 'update-password' && (
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-stone-700">{copy.email}</span>
              <span className="relative block">
                <Mail className="absolute top-1/2 h-4 w-4 -translate-y-1/2 start-3 text-stone-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white py-3 pe-3 ps-10 text-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
                  placeholder="name@example.com"
                />
              </span>
            </label>
          )}

          {mode !== 'reset' && (
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-stone-700">{copy.password}</span>
              <input
                type="password"
                required
                minLength={mode === 'signin' ? 1 : 8}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
              />
            </label>
          )}

          {(mode === 'signup' || mode === 'update-password') && (
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-stone-700">{copy.confirm}</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
              />
            </label>
          )}

          {mode === 'signup' && (
            <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{copy.adminNotice}</span>
            </div>
          )}

          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-800">{error}</p>}
          {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-emerald-800">{notice}</p>}
          {!isSupabaseConfigured && <p role="status" className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs leading-relaxed text-stone-700">{copy.configMissing}</p>}

          <button type="submit" disabled={busy || !isSupabaseConfigured} className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50">
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {copy.submit}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
            {mode === 'signin' && <button type="button" onClick={() => { setMode('reset'); setError(''); setNotice(''); }} className="font-semibold text-stone-600 underline-offset-4 hover:text-stone-950 hover:underline">{copy.reset}</button>}
            {mode === 'signin' && <button type="button" onClick={() => { setMode('signup'); setError(''); setNotice(''); }} className="font-semibold text-amber-800 underline-offset-4 hover:underline">{copy.switchSignup}</button>}
            {mode === 'signup' && <button type="button" onClick={() => { setMode('signin'); setError(''); setNotice(''); }} className="font-semibold text-stone-700 underline-offset-4 hover:underline">{copy.switchSignin}</button>}
            {(mode === 'reset' || mode === 'update-password') && <button type="button" onClick={() => { setMode('signin'); setError(''); setNotice(''); clearPasswordRecovery(); }} className="inline-flex items-center gap-1 font-semibold text-stone-700 underline-offset-4 hover:underline"><BackIcon className="h-3.5 w-3.5" />{copy.back}</button>}
          </div>
        </form>
      </section>
    </div>
  );
};
