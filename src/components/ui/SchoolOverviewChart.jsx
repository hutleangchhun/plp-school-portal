"use client"

import * as React from "react"
import { Label, Pie, PieChart, Sector } from "recharts"
import { useLanguage } from "@/contexts/LanguageContext"
import { Building } from "lucide-react"

// Function to generate dynamic colors
const generateColor = (index, total) => {
  const hues = [210, 120, 30]; // Blue, Green, Orange
  const lightnesses = [50, 50, 35]; // Darker orange
  return `hsl(${hues[index] || 0}, 70%, ${lightnesses[index] || 50}%)`;
}

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import Dropdown from "@/components/ui/Dropdown"


export default function SchoolOverviewChart({ schoolStats, className = "" }) {
  const categories = React.useMemo(() => ["students", "teachers", "directors"], [])
  const { t } = useLanguage();

  const colors = React.useMemo(() =>
    categories.map((_, index) => generateColor(index, categories.length)),
    [categories]
  )

  const chartData = React.useMemo(() => [
    { category: "students", count: schoolStats?.totalStudents || 0, fill: colors[0] },
    { category: "teachers", count: schoolStats?.totalTeachers || 0, fill: colors[1] },
    { category: "directors", count: schoolStats?.totalDirectors || 0, fill: colors[2] },
  ], [schoolStats, colors])

  const chartConfig = React.useMemo(() => ({
    count: { label: "Count" },
    students: { label: t('student', 'Students'), color: colors[0] },
    teachers: { label: t('teacher', 'Teachers'), color: colors[1] },
    directors: { label: t('director', 'Directors'), color: colors[2] },
  }), [colors, t])

  const [activeCategory, setActiveCategory] = React.useState(categories[0])

  const activeIndex = React.useMemo(
    () => chartData.findIndex((item) => item.category === activeCategory),
    [activeCategory, chartData]
  )

  const dropdownOptions = React.useMemo(() =>
    categories.map((key) => {
      const config = chartConfig[key]
      return {
        value: key,
        label: config?.label || key
      }
    }).filter(option => option.label),
    [categories, chartConfig]
  )

  const id = "school-overview-pie"

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex sm:flex-row flex-col items-start sm:items-center justify-start sm:justify-between w-full gap-3">
          <div className="flex flex-row gap-2">
            <div className="w-12 h-12 bg-rose-600 rounded-lg flex  items-center justify-center">
              <Building className="h-5 w-5 text-white" />
            </div>
            <div className="grid gap-1">
              <h3 className="text-md font-bold text-gray-900">
                {t('schoolPopulationDistribution', 'School Population Distribution')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('schoolPopulationDistributionDesc', 'School population distribution')}
              </p>
            </div>
          </div>
          <Dropdown
            value={activeCategory}
            onValueChange={setActiveCategory}
            options={dropdownOptions}
            placeholder="Select category"
            align="end"
            minWidth = 'min-w-[120px]'
          />
        </div>
      </div>

      <ChartContainer
        id={id}
        config={chartConfig}
        className="mx-auto aspect-square w-full max-w-[300px]"
      >
        <PieChart>
          <ChartTooltip
            cursor="default"
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="category"
            innerRadius={60}
            strokeWidth={5}
            activeIndex={activeIndex}
            activeShape={({
              outerRadius = 0,
              ...props
            }) => (
              <g>
                <Sector {...props} outerRadius={outerRadius + 10} />
                <Sector
                  {...props}
                  outerRadius={outerRadius + 25}
                  innerRadius={outerRadius + 12}
                />
              </g>
            )}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-3xl font-bold"
                      >
                        {chartData[activeIndex]?.count?.toLocaleString() || 0}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 24}
                        className="fill-muted-foreground"
                      >
                        {t('people', 'People')}
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
    </div>
  )
}