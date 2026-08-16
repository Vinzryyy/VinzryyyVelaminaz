import { NavLink } from 'react-router'

const links = [
  { to: '/',        label: 'Home'   },
  { to: '/events',  label: 'Events' },
  { to: '/artists', label: 'Artists'},
  { to: '/venues',  label: 'Venues' },
  { to: '/games',   label: 'Games'  },
]

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-12 h-[60px] bg-[var(--color-bg)] border-b border-white/[0.08]">
      <a href="/" className="text-[13px] font-bold tracking-[0.15em] uppercase text-white no-underline">
        VISARYYY<span className="text-[var(--color-accent)] mx-1">|</span>Archive
      </a>
      <nav className="flex gap-8">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `text-[13px] no-underline pb-1 border-b-2 transition-colors ${
                isActive
                  ? 'text-white border-[var(--color-accent)]'
                  : 'text-[var(--color-text-dim)] border-transparent hover:text-white'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="flex gap-2.5">
        <button className="text-[12px] text-[var(--color-text-dim)] bg-transparent border border-white/[0.08] rounded-[7px] px-3.5 py-1.5 cursor-pointer hover:border-white/20 hover:text-white transition-colors">
          Export
        </button>
        <button className="text-[12px] text-[var(--color-text-dim)] bg-transparent border border-white/[0.08] rounded-[7px] px-3.5 py-1.5 cursor-pointer hover:border-white/20 hover:text-white transition-colors">
          Share
        </button>
      </div>
    </header>
  )
}
