// แท็บ Lab 4 · โหลดแบบ lazy จาก App.jsx (firebase ไม่เพิ่มขนาดไฟล์ของหน้าอื่น)
// ?demo = คำนวณผลวิเคราะห์ในเบราว์เซอร์จาก CSV ไม่ต้องมี Firebase · ไม่งั้นอ่านจาก Firestore (ต้องตั้ง VITE_FIREBASE_*)
import { useMemo } from 'react'
import CustomersTab from './CustomersTab.jsx'
import SetupGuide from '../lab3/SetupGuide.jsx'
import { isConfigured } from '../lab3/firebase.js'
import { createDemoSource, firestoreAnalyticsSource } from './analyticsSource.js'

export default function Lab4Tab({ rows, products, holidays, demo }) {
  const source = useMemo(() => {
    if (demo) return createDemoSource(rows, products, holidays)
    return isConfigured ? firestoreAnalyticsSource : null
  }, [demo, rows, products, holidays])
  if (!source) return <SetupGuide />
  return <CustomersTab source={source} />
}
