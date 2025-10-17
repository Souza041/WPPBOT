import { useStats, useTrackingData, useConversations } from '../hooks/useApi'
import { 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Users,
  MessageSquare,
  Package,
  Star,
  Clock
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

function Analytics() {
  const { data: stats } = useStats()
  const { data: trackingData } = useTrackingData()
  const { data: conversationsData } = useConversations(1, 100)

  // Generate mock time series data for demonstration
  const generateTimeSeriesData = () => {
    const data = []
    const today = new Date()
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      data.push({
        date: date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
        conversations: Math.floor(Math.random() * 20) + 5,
        trackings: Math.floor(Math.random() * 15) + 3,
        ratings: Math.random() * 2 + 3.5
      })
    }
    
    return data
  }

  const timeSeriesData = generateTimeSeriesData()

  // Calculate performance metrics
  const totalConversations = stats?.totalConversations || 0
  const totalTracking = stats?.totalTracking || 0
  const averageRating = parseFloat(stats?.averageRating || 0)
  
  // Mock comparison data (would be calculated from historical data)
  const conversationGrowth = 12.5 // % growth
  const trackingGrowth = 8.3 // % growth
  const ratingChange = 0.2 // rating change

  const performanceCards = [
    {
      title: 'Total de Conversas',
      value: totalConversations,
      change: `+${conversationGrowth}%`,
      changeType: 'increase',
      icon: MessageSquare,
      color: 'text-blue-600'
    },
    {
      title: 'Total de Rastreamentos',
      value: totalTracking,
      change: `+${trackingGrowth}%`,
      changeType: 'increase',
      icon: Package,
      color: 'text-purple-600'
    },
    {
      title: 'Avaliação Média',
      value: averageRating.toFixed(1),
      change: `+${ratingChange}`,
      changeType: 'increase',
      icon: Star,
      color: 'text-yellow-600'
    },
    {
      title: 'Taxa de Sucesso',
      value: '94.2%',
      change: '+2.1%',
      changeType: 'increase',
      icon: TrendingUp,
      color: 'text-green-600'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Análises</h1>
        <p className="mt-1 text-sm text-gray-600">
          Análise detalhada de performance e tendências
        </p>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {performanceCards.map((card, index) => (
          <div key={index} className="bg-white overflow-hidden shadow-sm border border-gray-200 rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <card.icon className={`h-8 w-8 ${card.color}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.title}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {card.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        card.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {card.changeType === 'increase' ? (
                          <TrendingUp className="self-center flex-shrink-0 h-4 w-4" />
                        ) : (
                          <TrendingDown className="self-center flex-shrink-0 h-4 w-4" />
                        )}
                        <span className="ml-1">
                          {card.change}
                        </span>
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Conversations and Trackings Over Time */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Conversas e Rastreamentos (30 dias)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="conversations" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Conversas"
              />
              <Line 
                type="monotone" 
                dataKey="trackings" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                name="Rastreamentos"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Rating Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Tendência de Avaliação (30 dias)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 5]} />
              <Tooltip formatter={(value) => [`${value.toFixed(1)} ⭐`, 'Avaliação']} />
              <Area 
                type="monotone" 
                dataKey="ratings" 
                stroke="#F59E0B" 
                fill="#FEF3C7"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Rating Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Distribuição de Avaliações
          </h3>
          {stats?.ratingDistribution && stats.ratingDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.ratingDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ rating, percent }) => 
                    `${rating}⭐ ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.ratingDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma avaliação disponível</p>
              </div>
            </div>
          )}
        </div>

        {/* Service Usage */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Uso por Tipo de Serviço
          </h3>
          {stats?.serviceStats && stats.serviceStats.length > 0 ? (
            <div className="space-y-4">
              {stats.serviceStats.map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {service.service_type || 'N/A'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {service.count}
                  </span>
                </div>
              ))}
              
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={stats.serviceStats} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="service_type" hide />
                  <Tooltip />
                  <Bar 
                    dataKey="count" 
                    fill="#3B82F6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum dado de serviço disponível</p>
              </div>
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Métricas Principais
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">
                  Conversas/Dia
                </span>
              </div>
              <span className="text-lg font-bold text-blue-600">
                {stats?.conversationsToday || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <Package className="h-5 w-5 text-purple-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">
                  Rastreamentos/Dia
                </span>
              </div>
              <span className="text-lg font-bold text-purple-600">
                {stats?.trackingToday || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-green-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">
                  Taxa de Sucesso
                </span>
              </div>
              <span className="text-lg font-bold text-green-600">
                94.2%
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-yellow-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">
                  Tempo Médio
                </span>
              </div>
              <span className="text-lg font-bold text-yellow-600">
                3.2min
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Insights e Recomendações
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center mb-2">
              <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
              <h4 className="font-medium text-green-800">Performance Positiva</h4>
            </div>
            <p className="text-sm text-green-700">
              O sistema está apresentando crescimento consistente nas conversas (+12.5%) e 
              mantendo alta taxa de sucesso nos rastreamentos.
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center mb-2">
              <Star className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="font-medium text-blue-800">Satisfação Alta</h4>
            </div>
            <p className="text-sm text-blue-700">
              A avaliação média de {averageRating.toFixed(1)} estrelas indica alta satisfação 
              dos usuários com o atendimento automatizado.
            </p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center mb-2">
              <Package className="h-5 w-5 text-purple-600 mr-2" />
              <h4 className="font-medium text-purple-800">Integração Estável</h4>
            </div>
            <p className="text-sm text-purple-700">
              As integrações com a API SSW estão funcionando de forma estável, 
              com boa taxa de resposta nos rastreamentos.
            </p>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-center mb-2">
              <Clock className="h-5 w-5 text-yellow-600 mr-2" />
              <h4 className="font-medium text-yellow-800">Otimização Contínua</h4>
            </div>
            <p className="text-sm text-yellow-700">
              Continue monitorando os horários de pico para otimizar a capacidade 
              de atendimento e melhorar os tempos de resposta.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics