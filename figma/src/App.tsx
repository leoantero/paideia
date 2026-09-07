import { useState } from 'react'
import Welcome from './screens/Welcome'
import Login from './screens/Login'
import StudentApp from './screens/StudentApp'
import ParentApp from './screens/ParentApp'
import TeacherApp from './screens/TeacherApp'
import ManagerApp from './screens/ManagerApp'

export type Role = 'student' | 'parent' | 'teacher' | 'manager'
export type AppView = 'welcome' | `login-${Role}` | Role

export default function App() {
  const [view, setView] = useState<AppView>('welcome')

  const go = (v: AppView) => setView(v)

  if (view === 'welcome') return <Welcome onSelect={(role) => go(`login-${role}`)} />
  if (view === 'login-student') return <Login role="student" onBack={() => go('welcome')} onLogin={() => go('student')} />
  if (view === 'login-parent') return <Login role="parent" onBack={() => go('welcome')} onLogin={() => go('parent')} />
  if (view === 'login-teacher') return <Login role="teacher" onBack={() => go('welcome')} onLogin={() => go('teacher')} />
  if (view === 'login-manager') return <Login role="manager" onBack={() => go('welcome')} onLogin={() => go('manager')} />
  if (view === 'student') return <StudentApp onLogout={() => go('welcome')} />
  if (view === 'parent') return <ParentApp onLogout={() => go('welcome')} />
  if (view === 'teacher') return <TeacherApp onLogout={() => go('welcome')} />
  if (view === 'manager') return <ManagerApp onLogout={() => go('welcome')} />
  return null
}
