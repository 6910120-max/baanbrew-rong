// ชั้นข้อมูลของแท็บ Lab 4 · 2 แบบที่ใช้ API เดียวกัน (onAuth, signIn, signOut, loadAnalytics)
//   firestoreAnalyticsSource  อ่านผลวิเคราะห์ 5 เอกสารจาก Firestore (5 reads ต่อการเปิดหน้า)
//   createDemoSource          คำนวณในเบราว์เซอร์จาก CSV ด้วยฟังก์ชันชุดเดียวกับ pipeline (เปิดด้วย ?demo ไม่ใช้โควตา)
import { doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, db, googleProvider } from '../lab3/firebase.js'
import { buildDemoAnalytics } from './demoAnalytics.js'

const ANALYTICS_DOCS = ['meta', 'daily', 'rfm', 'cohort', 'abc']

export const firestoreAnalyticsSource = {
  mode: 'firebase',
  onAuth: (cb) => onAuthStateChanged(auth, cb),
  signIn: () => signInWithPopup(auth, googleProvider),
  signOut: () => signOut(auth),

  /** อ่านผลวิเคราะห์ที่ pipeline สร้างไว้ 5 เอกสาร (5 reads แทนยอดขายดิบหลายหมื่นเอกสาร) */
  async loadAnalytics() {
    const snaps = await Promise.all(ANALYTICS_DOCS.map((k) => getDoc(doc(db, 'analytics', k))))
    if (!snaps[0].exists()) {
      const e = new Error('ยังไม่มีผลวิเคราะห์ใน Firestore รัน npm run analytics ก่อน')
      e.code = 'not-built'
      throw e
    }
    const out = { reads: snaps.length }
    snaps.forEach((s, i) => {
      out[ANALYTICS_DOCS[i]] = s.exists() ? s.data() : { error: `ไม่พบเอกสาร analytics/${ANALYTICS_DOCS[i]}` }
    })
    const built = out.meta.builtAt?.toDate?.()
    out.meta = { ...out.meta, builtAt: built ? built.toISOString() : null }
    return out
  },
}

/** โหมดสาธิต: ผู้ใช้จำลองล็อกอินอยู่แล้ว และคำนวณผลวิเคราะห์ในเบราว์เซอร์ */
export function createDemoSource(csvRows, productRows, holidays = {}) {
  const user = { uid: 'demo-user', displayName: 'ผู้ใช้สาธิต', email: 'demo@example.com' }
  let authCb = null
  let signedIn = true
  return {
    mode: 'demo',
    onAuth: (cb) => {
      authCb = cb
      cb(signedIn ? user : null)
      return () => {
        authCb = null
      }
    },
    signIn: async () => {
      signedIn = true
      authCb?.(user)
    },
    signOut: async () => {
      signedIn = false
      authCb?.(null)
    },
    loadAnalytics: async () => buildDemoAnalytics(csvRows, productRows, holidays),
  }
}
