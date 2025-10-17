import { Link, useLocation } from 'react-router-dom'
import { 
  BarChart3, 
  MessageSquare, 
  Package, 
  TrendingUp, 
  X,
  Bot
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Conversas', href: '/conversations', icon: MessageSquare },
  { name: 'Rastreamentos', href: '/tracking', icon: Package },
  { name: 'Análises', href: '/analytics', icon: TrendingUp },
]

function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center">
            <Bot className="h-8 w-8 text-whatsapp-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">
              WhatsApp Bot
            </span>
          </div>
          <button
            className="lg:hidden"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-6 w-6 text-gray-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col px-6 py-6">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={`
                          group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold transition-colors
                          ${isActive
                            ? 'bg-primary-50 text-primary-600'
                            : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        <item.icon
                          className={`h-6 w-6 shrink-0 ${
                            isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-primary-600'
                          }`}
                        />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            Sistema de Atendimento WhatsApp
            <br />
            v1.0.0
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar