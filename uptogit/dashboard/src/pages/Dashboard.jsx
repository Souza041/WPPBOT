import { useStats } from '../hooks/useApi'
import StatCard from '../components/StatCard'
import { 
  MessageSquare, 
  Package, 
  Star, 
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
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
  Cell,
  LineChart,
  Line
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

function Dashboard() {
  const { data: stats, loading, error } = useStats()

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
              Erro ao carregar dados
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total de Conversas',
      value: stats?.totalConversations || 0,
      icon: MessageSquare,
      color: 'whatsapp'
    },
    {
      title: 'Conversas Hoje',
      value: stats?.conversationsToday || 0,
      icon: Clock,
      color: 'blue'
    },
    {
      title: 'Rastreamentos Total',
      value: stats?.totalTracking || 0,
      icon: Package,
      color: 'purple'
    },
    {
      title: 'Rastreamentos Hoje',
      value: stats?.trackingToday || 0,
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'Avaliação Média',
      value: `${stats?.averageRating || 0}/5`,
      icon: Star,
      color: 'yellow'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Visão geral do sistema de atendimento WhatsApp
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Rating Distribution */}
        <div className="chart-container">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Distribuição de Avaliações
          </h3>
          {stats?.ratingDistribution && stats.ratingDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.ratingDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="rating" 
                  tickFormatter={(value) => `${value} ⭐`}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value} avaliações`, 'Quantidade']}
                  labelFormatter={(value) => `${value} estrelas`}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Nenhuma avaliação disponível
            </div>
          )}
        </div>

        {/* Service Usage */}
        <div className="chart-container">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Uso por Tipo de Serviço
          </h3>
          {stats?.serviceStats && stats.serviceStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.serviceStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ service_type, percent }) => 
                    `${service_type?.toUpperCase() || 'N/A'} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.serviceStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} usos`, 'Quantidade']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Nenhum dado de serviço disponível
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="chart-container">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Atividade Recente
          </h3>
          <div className="flex space-x-2 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-whatsapp-500 rounded mr-2"></div>
              <span className="text-gray-600">Conversas</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
              <span className="text-gray-600">Rastreamentos</span>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-4">
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Sistema iniciado com sucesso
              </p>
              <p className="text-sm text-gray-600">
                Bot WhatsApp conectado e pronto para atender
              </p>
            </div>
            <span className="text-xs text-gray-500">
              {new Date().toLocaleTimeString('pt-BR')}
            </span>
          </div>

          {stats?.conversationsToday > 0 && (
            <div className="flex items-center p-3 bg-whatsapp-50 rounded-lg">
              <MessageSquare className="h-5 w-5 text-whatsapp-500 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {stats.conversationsToday} conversas iniciadas hoje
                </p>
                <p className="text-sm text-gray-600">
                  Atendimento automatizado funcionando
                </p>
              </div>
            </div>
          )}

          {stats?.trackingToday > 0 && (
            <div className="flex items-center p-3 bg-purple-50 rounded-lg">
              <Package className="h-5 w-5 text-purple-500 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {stats.trackingToday} rastreamentos realizados hoje
                </p>
                <p className="text-sm text-gray-600">
                  Integrações com SSW funcionando
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard