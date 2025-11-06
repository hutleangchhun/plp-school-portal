/**
 * Report Charts Component
 * Reusable chart components for different report types
 */

import React from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

/**
 * Parent Status Bar Chart
 */
export const ParentStatusChart = ({ data, t }) => {
  const parentStatusData = [
    { name: t('bothParents', 'មានឪពុកម្តាយទាំងពីរ'), value: data.bothParents || 0, color: '#10b981' },
    { name: t('oneParent', 'មានឪពុកម្តាយម្នាក់'), value: data.oneParent || 0, color: '#f59e0b' },
    { name: t('noParents', 'គ្មានឪពុកម្តាយ'), value: data.noParents || 0, color: '#ef4444' }
  ].filter(item => item.value > 0);

  if (parentStatusData.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h4 className="text-base font-semibold text-gray-900 mb-4">{t('parentStatus', 'ស្ថានភាពឪពុកម្តាយ')}</h4>
      <ChartContainer
        config={{
          value: {
            label: t('students', 'សិស្ស'),
          },
        }}
        className="h-[300px] w-full"
      >
        <BarChart data={parentStatusData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
          <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis dataKey="name" type="category" width={90} tickLine={false} axisLine={false} className="text-xs" />
          <ChartTooltip content={<ChartTooltipContent formatter={(value) => Math.round(value)} />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {parentStatusData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
};

/**
 * Accessibility Distribution Pie Chart
 */
export const AccessibilityChart = ({ data, t }) => {
  const accessibilityChartData = Object.entries(data).map(([name, value], index) => ({
    name,
    value,
    color: ['#eab308', '#f59e0b', '#f97316', '#ef4444', '#ec4899'][index % 5]
  }));

  if (accessibilityChartData.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h4 className="text-base font-semibold text-gray-900 mb-4">{t('accessibilityDistribution', 'ការចែកចាយប្រភេទពិការភាព')}</h4>
      <ChartContainer
        config={{
          value: {
            label: t('students', 'សិស្ស'),
          },
        }}
        className="h-[300px] w-full"
      >
        <PieChart>
          <Pie
            data={accessibilityChartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {accessibilityChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent formatter={(value) => Math.round(value)} />} />
        </PieChart>
      </ChartContainer>
    </div>
  );
};

/**
 * Ethnic Groups Distribution Bar Chart
 */
export const EthnicGroupsBarChart = ({ data, t }) => {
  const ethnicGroupData = Object.entries(data).map(([name, value], index) => ({
    name,
    value,
    color: ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f97316'][index % 5]
  }));

  if (ethnicGroupData.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h4 className="text-base font-semibold text-gray-900 mb-4">{t('ethnicGroupsDistribution', 'ការចែកចាយក្រុមជនជាតិ')}</h4>
      <ChartContainer
        config={{
          value: {
            label: t('students', 'សិស្ស'),
          },
        }}
        className="h-[300px] w-full"
      >
        <BarChart data={ethnicGroupData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
          <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis dataKey="name" type="category" width={70} tickLine={false} axisLine={false} className="text-xs" />
          <ChartTooltip content={<ChartTooltipContent formatter={(value) => Math.round(value)} />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {ethnicGroupData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
};

/**
 * Ethnic Groups Pie Chart
 */
export const EthnicGroupsPieChart = ({ data, t }) => {
  const ethnicGroupData = Object.entries(data).map(([name, value], index) => ({
    name,
    value,
    color: ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f97316'][index % 5]
  }));

  if (ethnicGroupData.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h4 className="text-base font-semibold text-gray-900 mb-4">{t('ethnicGroups', 'ក្រុមជនជាតិ')}</h4>
      <ChartContainer
        config={{
          value: {
            label: t('students', 'សិស្ស'),
          },
        }}
        className="h-[300px] w-full"
      >
        <PieChart>
          <Pie
            data={ethnicGroupData.slice(0, 6)}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {ethnicGroupData.slice(0, 6).map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent formatter={(value) => Math.round(value)} />} />
        </PieChart>
      </ChartContainer>
    </div>
  );
};
