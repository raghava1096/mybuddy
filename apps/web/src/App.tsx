import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import NewPlan from './pages/NewPlan'
import PlanPage from './pages/PlanPage'
import Analytics from './pages/Analytics'
import Planner from './pages/Planner'

export default function App() {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="logo">
            <span className="logo-mark">B</span>
            MyBuddy
          </NavLink>
          <nav className="tabs-nav" aria-label="Main">
            <NavLink to="/" end>
              Plans
            </NavLink>
            <NavLink to="/analytics">Analytics</NavLink>
            <NavLink to="/planner">Money plan</NavLink>
          </nav>
        </div>
      </header>

      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new" element={<NewPlan />} />
          <Route path="/plan/:id" element={<PlanPage />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>

      <footer className="foot">
        MyBuddy · built by Raghava S ·{' '}
        <a href="https://github.com/raghava1096/mybuddy" target="_blank" rel="noreferrer">
          source
        </a>
      </footer>
    </>
  )
}
