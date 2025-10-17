import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react'

function StatCard({ title, value, change, changeType, icon: Icon, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
    whatsapp: 'bg-whatsapp-500'
  }

  return (
    <div className="stat-card">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`inline-flex items-center justify-center p-3 rounded-md ${colorClasses[color]} text-white`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">
                {value}
              </div>
              {change && (
                <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                  changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {changeType === 'increase' ? (
                    <ArrowUpIcon className="self-center flex-shrink-0 h-4 w-4" />
                  ) : (
                    <ArrowDownIcon className="self-center flex-shrink-0 h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {changeType === 'increase' ? 'Increased' : 'Decreased'} by
                  </span>
                  {change}
                </div>
              )}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  )
}

export default StatCard