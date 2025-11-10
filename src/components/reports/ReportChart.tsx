
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { useState, useEffect } from 'react'

interface ChartData {
  name: string
  value: number
  color: string
}

interface CategoryData {
  [key: string]: {
    receitas: number
    despesas: number
    total: number
  }
}

interface ReportChartProps {
  chartData: ChartData[]
  categoryData: CategoryData
}

const chartConfig = {
  receitas: {
    label: "Receitas",
    color: "#22c55e",
  },
  despesas: {
    label: "Despesas", 
    color: "#ef4444",
  },
}

export function ReportChart({ chartData, categoryData }: ReportChartProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640)
    }

    // Check on mount
    checkScreenSize()

    // Add event listener
    window.addEventListener('resize', checkScreenSize)

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Prepare category chart data
  const categoryChartData = Object.entries(categoryData).map(([name, data]) => ({
    category: name,
    receitas: data.receitas,
    despesas: data.despesas,
  }))

  // Mobile: Stack charts vertically, Desktop: Side by side
  if (isMobile) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ChartContainer config={chartConfig} className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius="65%"
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    labelStyle={{ fontSize: '12px' }}
                    contentStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            {/* Legend mobile - Melhorada */}
            <div className="space-y-2 mt-3">
              {chartData.map((entry, index) => {
                const totalValue = chartData.reduce((sum, item) => sum + item.value, 0)
                const percentage = totalValue > 0 ? ((entry.value / totalValue) * 100).toFixed(1) : 0
                
                return (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm font-medium text-gray-700 line-clamp-1">
                        {entry.name}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-gray-900">
                        {percentage}%
                      </span>
                      <span className="text-xs text-gray-500">
                        R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ChartContainer config={chartConfig} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={categoryChartData} 
                  margin={{ 
                    top: 15, 
                    right: 10, 
                    left: 5, 
                    bottom: 80 
                  }}
                >
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 9 }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fontSize: 9 }}
                    width={35}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    labelStyle={{ fontSize: '12px' }}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Bar dataKey="receitas" fill="#22c55e" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="despesas" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Desktop version
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius="70%"
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Receitas vs Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={categoryChartData} 
                margin={{ 
                  top: 20, 
                  right: 10, 
                  left: 10, 
                  bottom: 40 
                }}
              >
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="receitas" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="despesas" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
