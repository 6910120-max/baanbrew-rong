// ตัวเลือกหน้าสำหรับแท็บ Lab 3 · โหลดแบบ lazy จาก App.jsx เพื่อไม่ให้ firebase เพิ่มขนาดไฟล์ของหน้าอื่น
// ถ้ายังไม่ได้ตั้งค่า VITE_FIREBASE_* (เช่น บน Vercel ที่ยังไม่ใส่ Environment Variables) จะแสดงคู่มือตั้งค่าแทน
import LiveTab from './LiveTab.jsx'
import RulesTester from './RulesTester.jsx'
import SetupGuide from './SetupGuide.jsx'
import { isConfigured } from './firebase.js'

export default function Lab3Tab({ view }) {
  if (!isConfigured) return <SetupGuide />
  return view === 'rules' ? <RulesTester /> : <LiveTab />
}
