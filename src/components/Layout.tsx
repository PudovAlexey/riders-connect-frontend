import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="flex justify-center min-h-full bg-slate-100">
      <div className="relative w-full max-w-[440px] min-h-dvh bg-slate-50 flex flex-col">
        <div className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
