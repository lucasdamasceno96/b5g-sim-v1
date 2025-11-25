import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

export default function Header() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const activeClass = "bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium"
  const inactiveClass = "text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"

  return (
    <header className="bg-gray-800 shadow-md">
      <nav className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-white">
              B5GCyberTestV2X
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
            >
              Home
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
            >
              About
            </NavLink>
            
            {/* --- DROPDOWN DE SIMULAÇÃO --- */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={inactiveClass}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)} // Fecha ao perder foco
              >
                <span>Simulations</span>
                <svg className="inline-block h-4 w-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Menu Dropdown */}
              {isDropdownOpen && (
                <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-gray-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    <Link
                      to="/simulations/simple-jamming"
                      className="text-gray-200 block px-4 py-2 text-sm hover:bg-gray-600"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Simple Jamming
                    </Link>
                    <Link
                      to="/simulations/advanced-jamming"
                      className="text-gray-200 block px-4 py-2 text-sm hover:bg-gray-600"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Advanced Jamming
                    </Link>
                    <Link
                      to="/simulations/expert-jamming"
                      className="text-gray-200 block px-4 py-2 text-sm hover:bg-gray-600"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Expert Jamming
                    </Link>
                  </div>
                </div>
              )}
            </div>
            {/* --- FIM DO DROPDOWN --- */}

            <NavLink
              to="/tools/map-generator"
              className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
            >
              Map Generator
            </NavLink>
          </div>
        </div>
      </nav>
    </header>
  )
}