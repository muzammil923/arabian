import { Link } from 'react-router-dom'
import { Button } from '../components/ui'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <h1 className="text-lg font-semibold text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-500">The page you are looking for does not exist.</p>
      <Link to="/">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  )
}
