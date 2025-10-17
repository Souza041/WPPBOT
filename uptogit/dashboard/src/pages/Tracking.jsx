import { useState } from 'react'
import { useTrackingData } from '../hooks/useApi'
import { 
  Package, 
  MapPin, 
  Building, 
  FileText,
  Filter,
  Search,
  Download,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']

function Tracking() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    city: '',
    sender: ''
  })

  const { data, loading, error } = useTrackingData(filters)

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'ENTREGA REALIZADA': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'EM TRANSITO': { color: 'bg-blue-100 text-blue-800', icon: Clock },
      'PENDENTE': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'CANCELADO': { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    }

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', icon: Clock }
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status || 'N/A'}
      </span>
    )
  }

  const getTypeBadge = (type) => {
    const typeConfig = {
      'danfe': { color: 'bg-purple-100 text-purple-800', icon: FileText, text: 'DANFE' },
      'cpf': { color: 'bg-blue-100 text-blue-800', icon: Package, text: 'CPF' }
    }

    const config = typeConfig[type] || typeConfig['danfe']
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    )
  }

  const exportData = () => {
    if (!data?.trackingData) return

    const csvContent = [
      ['Tipo', 'Valor', 'Cidade', 'Remetente', 'Status', 'Data'],
      ...data.trackingData.map(item => [
        item.tracking_type,
        item.tracking_value,
        item.city || 'N/A',
        item.sender || 'N/A',
        item.status || 'N/A',
        new Date(item.created_at).toLocaleString('pt-BR')
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `rastreamentos_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Erro ao carregar dados de rastreamento
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const trackingData = data?.trackingData || []
  const cityStats = data?.cityStats || []
  const senderStats = data?.senderStats || []
  const statusStats = data?.statusStats || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rastreamentos</h1>
          <p className="mt-1 text-sm text-gray-600">
            Análise de rastreamentos realizados
          </p>
        </div>
        
        <button
          onClick={exportData}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cidade
            </label>
            <input
              type="text"
              placeholder="Filtrar por cidade..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remetente
            </label>
            <input
              type="text"
              placeholder="Filtrar por remetente..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={filters.sender}
              onChange={(e) => handleFilterChange('sender', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cities Distribution */}
        <div className="chart-container">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Top 10 Cidades
          </h3>
          {cityStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cityStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="city" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum dado de cidade disponível</p>
              </div>
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="chart-container">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Status dos Rastreamentos
          </h3>
          {statusStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percent }) => 
                    `${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {statusStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum dado de status disponível</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Senders */}
      {senderStats.length > 0 && (
        <div className="chart-container">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Top 10 Remetentes
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={senderStats} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis 
                type="category"
                dataKey="sender" 
                width={150}
                tick={{ fontSize: 12 }}
              />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tracking Data Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Últimos Rastreamentos
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remetente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trackingData.slice(0, 20).map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadge(item.tracking_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {item.tracking_value}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.city || 
                      <span className="text-gray-400">N/A</span>
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                    {item.sender || 
                      <span className="text-gray-400">N/A</span>
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {trackingData.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Nenhum rastreamento encontrado
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {Object.values(filters).some(f => f) ? 
                'Tente ajustar os filtros de busca.' : 
                'Os rastreamentos aparecerão aqui conforme forem realizados.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Tracking