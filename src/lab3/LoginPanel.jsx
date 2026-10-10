// การ์ดล็อกอินกลางของแอป (ฉากหลังมาสคอต) ใช้ร่วมกันในแท็บ "สด · Firestore" และแท็บ "ลูกค้า & เมนู"
//   onGoogle   ฟังก์ชันล็อกอินด้วย Google (ไม่ส่ง = ใช้ Firebase Auth ตรง ๆ)
//   emailLogin false = ซ่อนฟอร์มอีเมล/สมัครสมาชิก (ใช้ในโหมดสาธิตที่ไม่มี Firebase จริง)
import { useState } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from './firebase.js'
import loginBg from '../assets/login-bg.webp'

const authErrorText = (e) =>
  e.code === 'auth/unauthorized-domain'
    ? 'โดเมนนี้ยังไม่ได้รับอนุญาต เพิ่มใน Authentication → Settings → Authorized domains'
    : e.code === 'auth/operation-not-allowed'
      ? 'ยังไม่ได้เปิดการล็อกอินด้วย Google ใน Authentication → Sign-in method'
      : e.code === 'auth/popup-blocked'
        ? 'เบราว์เซอร์บล็อกหน้าต่างล็อกอิน อนุญาต pop-up สำหรับเว็บนี้แล้วลองใหม่'
        : e.code === 'auth/popup-closed-by-user'
          ? 'ปิดหน้าต่างล็อกอินก่อนเสร็จ ลองกดอีกครั้ง'
          : e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found'
            ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            : e.code === 'auth/invalid-email'
              ? 'รูปแบบอีเมลไม่ถูกต้อง'
              : e.code === 'auth/email-already-in-use'
                ? 'อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบแทน'
                : e.code === 'auth/weak-password'
                  ? 'รหัสผ่านสั้นเกินไป ต้องมีอย่างน้อย 6 ตัวอักษร'
                  : e.code === 'auth/too-many-requests'
                    ? 'ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่'
                    : e.code === 'auth/network-request-failed'
                      ? 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ ตรวจแล้วลองใหม่'
                      : `ล็อกอินไม่สำเร็จ: ${e.message}`

export default function LoginPanel({
  kicker = 'บ้านบรู · ยอดขายสด',
  footnote = 'ข้อมูลยอดขายเปิดดูได้เฉพาะผู้ที่ล็อกอินเท่านั้น',
  onGoogle,
  emailLogin = true,
}) {
  const [authError, setAuthError] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [busy, setBusy] = useState(false)

  async function login() {
    setAuthError(null)
    try {
      await (onGoogle ? onGoogle() : signInWithPopup(auth, googleProvider))
    } catch (e) {
      setAuthError(authErrorText(e))
    }
  }

  async function submitEmail(e) {
    e.preventDefault()
    setAuthError(null)
    setBusy(true)
    try {
      const run = mode === 'signup' ? createUserWithEmailAndPassword : signInWithEmailAndPassword
      await run(auth, email.trim(), password)
    } catch (err) {
      setAuthError(authErrorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    // ฉากหลังเป็นภาพมาสคอตอยู่ฝั่งขวา จึงวางการ์ดล็อกอินไว้ฝั่งซ้าย (มือถือวางไว้ด้านล่างเพื่อไม่บังหน้ามาสคอต)
    <div
      className="relative flex min-h-[700px] items-end overflow-hidden rounded-3xl border border-line shadow-sm sm:min-h-[580px] sm:items-center"
      style={{ backgroundImage: `url(${loginBg})`, backgroundSize: 'cover', backgroundPosition: '78% center' }}
    >
      <div className="w-full p-4 sm:py-10 sm:pr-10 sm:pl-[4%] lg:pl-[14%]">
        <div className="w-full max-w-sm rounded-2xl bg-white/85 p-6 text-emerald-950 shadow-xl ring-1 ring-white/70 backdrop-blur-md sm:p-7">
          <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">{kicker}</p>
          <h2 className="mt-1 text-2xl leading-tight font-bold">{mode === 'signup' ? 'สมัครสมาชิก' : 'ยินดีต้อนรับกลับมา'}</h2>
          {emailLogin && (
            <>
            <form onSubmit={submitEmail} className="mt-5 space-y-3">
              <label className="block text-sm font-medium text-emerald-900">
                อีเมล
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-950 outline-none placeholder:text-emerald-900/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </label>
              <label className="block text-sm font-medium text-emerald-900">
                รหัสผ่าน
                <input
                  type="password"
                  required
                  minLength={mode === 'signup' ? 6 : undefined}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'อย่างน้อย 6 ตัวอักษร' : '••••••••'}
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-950 outline-none placeholder:text-emerald-900/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="bg-grad w-full rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? 'กำลังดำเนินการ…' : mode === 'signup' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-emerald-900/50">
              <span className="h-px flex-1 bg-emerald-900/15" />
              หรือ
              <span className="h-px flex-1 bg-emerald-900/15" />
            </div>

            </>
          )}
          <button
            type="button"
            onClick={login}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-emerald-200 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-50 active:scale-[0.99]"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
              <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
            </svg>
            เข้าสู่ระบบด้วย Google
          </button>
          {authError && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 p-2.5 text-sm text-red-700">
              ❌ {authError}
            </p>
          )}
          {emailLogin && (
            <>
            {/* กด "สมัครสมาชิก" แล้วการ์ดเดียวกันจะเปลี่ยนเป็นฟอร์มสมัคร (กดอีกครั้งเพื่อกลับมาเข้าสู่ระบบ) */}
            <p className="mt-4 text-center text-sm text-emerald-900/75">
              {mode === 'signup' ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signup' ? 'login' : 'signup')
                  setAuthError(null)
                }}
                className="font-semibold text-emerald-700 underline-offset-2 hover:underline"
              >
                {mode === 'signup' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
              </button>
            </p>
            </>
          )}
          <p className="mt-4 text-center text-xs text-emerald-900/60">{footnote}</p>
        </div>
      </div>
    </div>
  )
}
