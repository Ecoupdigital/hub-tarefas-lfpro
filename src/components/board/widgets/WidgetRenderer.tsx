import React, { useMemo, useCallback } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import type { DashboardWidget, WidgetConfig, WidgetFilter } from '@/hooks/useDashboardWidgets';
import { resolveWidgetDataSource } from '@/hooks/useDashboardWidgets';
import type { Item, Column, Group } from '@/types/board';
import { useDashboardFilter } from '@/context/DashboardFilterContext';
import NumbersWidget from './NumbersWidget';
import TextWidget from './TextWidget';
import ActivityWidget from './ActivityWidget';
import ProgressWidget from './ProgressWidget';
import TableWidget from './TableWidget';
import { useApp } from '@/context/AppContext';

interface WidgetRendererProps {
  widget: DashboardWidget;
  items: Item[];
  columns: Column[];
  groups: Group[];
  boardId: string;
  profiles?: Array<{ id: string; name?: string; full_name?: string }>;
  onConfigChange: (config: WidgetConfig) => void;
}

const FALLBACK_COLORS = [
  '#579BFC', '#FDAB3D', '#00C875', '#E2445C', '#A25DDC',
  '#FF642E', '#CAB641', '#9AADBD', '#66CCFF', '#7F5347',
];

function applyWidgetFilters(items: Item[], filters: WidgetFilter[], allColumns: Column[]): Item[] {
  if (!filters || filters.length === 0) return items;

  return items.filter(item => {
    return filters.every(filter => {
      const cv = item.columnValues[filter.columnId];
      const val = cv?.value;

      switch (filter.operator) {
        case 'is_empty':
          return val == null || val === '' || (Array.isArray(val) && val.length === 0);
        case 'is_not_empty':
          return val != null && val !== '' && !(Array.isArray(val) && val.length === 0);
        case 'eq':
          if (Array.isArray(val)) return val.includes(filter.value);
          return String(val) === String(filter.value);
        case 'neq':
          if (Array.isArray(val)) return !val.includes(filter.value);
          return String(val) !== String(filter.value);
        case 'in':
          if (Array.isArray(filter.value)) {
            return filter.value.some((fv: any) => {
              if (Array.isArray(val)) return val.includes(fv);
              return String(val) === String(fv);
            });
          }
          return false;
        case 'not_in':
          if (Array.isArray(filter.value)) {
            return !filter.value.some((fv: any) => {
              if (Array.isArray(val)) return val.includes(fv);
              return String(val) === String(fv);
            });
          }
          return true;
        case 'gt':
          return Number(val) > Number(filter.value);
        case 'lt':
          return Number(val) < Number(filter.value);
        case 'gte':
          return Number(val) >= Number(filter.value);
        case 'lte':
          return Number(val) <= Number(filter.value);
        default:
          return true;
      }
    });
  });
}

function getStatusDistribution(items: Item[], columns: Column[], statusColumnId?: string) {
  const statusCols = statusColumnId
    ? columns.filter(c => c.id === statusColumnId)
    : columns.filter(c => c.type === 'status');

  const map: Record<string, { name: string; color: string; count: number; key: string }> = {};
  for (const col of statusCols) {
    const labels = col.settings.labels || {};
    for (const item of items) {
      const val = item.columnValues[col.id]?.value;
      if (val != null && labels[String(val)]) {
        const label = labels[String(val)];
        const key = `${col.id}::${val}`;
        if (!map[key]) {
          map[key] = { name: label.name, color: label.color, count: 0, key: String(val) };
        }
        map[key].count++;
      }
    }
  }
  return Object.values(map).filter(d => d.count > 0);
}

function getGroupBarData(groups: Group[]) {
  return groups.map(g => ({
    name: g.title,
    count: g.items.length,
    color: g.color,
  }));
}

const DATE_RANGE_DAYS: Record<string, number> = {
  last_7: 7,
  last_14: 14,
  last_30: 30,
  last_90: 90,
};

const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widget,
  items,
  columns,
  groups,
  boardId,
  profiles = [],
  onConfigChange,
}) => {
  const { setSelectedItem } = useApp();
  const { activeFilter, setDashboardFilter } = useDashboardFilter();
  const resolvedConfig = useMemo(() => resolveWidgetDataSource(widget.config), [widget.config]);

  const applyFilters = useCallback((sourceItems: Item[]): Item[] => {
    let filtered = sourceItems;

    // Apply widget-level filters
    if (resolvedConfig.filters && resolvedConfig.filters.length > 0) {
      filtered = applyWidgetFilters(filtered, resolvedConfig.filters, columns);
    }

    // Apply cross-widget dashboard filter
    if (activeFilter) {
      filtered = filtered.filter(item => {
        const cv = item.columnValues[activeFilter.columnId];
        if (!cv) return false;
        const val = cv.value;
        if (Array.isArray(val)) return val.includes(activeFilter.value);
        return String(val) === String(activeFilter.value);
      });
    }

    return filtered;
  }, [resolvedConfig.filters, activeFilter, columns]);

  const filteredItems = useMemo(() => applyFilters(items), [applyFilters, items]);

  const { widget_type } = widget;

  switch (widget_type) {
    case 'pie_chart': {
      const statusColId = resolvedConfig.metricColumnId ?? resolvedConfig.statusColumnId;
      const data = getStatusDistribution(filteredItems, columns, statusColId);

      // chartType override: render as bar if configured
      if (resolvedConfig.chartType === 'bar' || resolvedConfig.chartType === 'bar_horizontal') {
        if (data.length === 0) {
          return <p className="text-center text-muted-foreground py-8 font-density-cell">Sem dados</p>;
        }
        return (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => [`${value} itens`, 'Quantidade']} />
              <Bar
                dataKey="count"
                radius={[0, 4, 4, 0]}
                className="cursor-pointer"
                onClick={(_: any, index: number) => {
                  const entry = data[index];
                  if (entry) {
                    setDashboardFilter({
                      columnId: statusColId ?? '',
                      value: entry.key,
                      label: entry.name,
                    });
                  }
                }}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }

      if (data.length === 0) {
        return <p className="text-center text-muted-foreground py-8 font-density-cell">Sem dados de status</p>;
      }
      const total = data.reduce((s, d) => s + d.count, 0);
      return (
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                className="cursor-pointer"
                onClick={(_: any, index: number) => {
                  const entry = data[index];
                  if (entry) {
                    setDashboardFilter({
                      columnId: statusColId ?? '',
                      value: entry.key,
                      label: entry.name,
                    });
                  }
                }}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number, name: string) => [`${value} itens`, name]} />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-xl font-bold">
                {total}
              </text>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-1 justify-center">
            {data.map((d, i) => (
              <div key={i} className="flex items-center gap-1 font-density-tiny">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground">{d.name} ({d.count})</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'bar_chart': {
      const groupByType = resolvedConfig.groupByType ?? (resolvedConfig.groupBy === 'status' ? 'column' : 'group');
      const statusColId = resolvedConfig.metricColumnId ?? resolvedConfig.statusColumnId;

      const data = groupByType === 'column' || resolvedConfig.groupBy === 'status'
        ? getStatusDistribution(filteredItems, columns, statusColId).map(d => ({ name: d.name, count: d.count, color: d.color, key: d.key }))
        : getGroupBarData(groups).map(d => ({ ...d, key: d.name }));

      // chartType override: render as pie if configured
      if (resolvedConfig.chartType === 'pie' || resolvedConfig.chartType === 'donut') {
        if (data.length === 0) {
          return <p className="text-center text-muted-foreground py-8 font-density-cell">Sem dados</p>;
        }
        const total = data.reduce((s, d) => s + d.count, 0);
        const innerRadius = resolvedConfig.chartType === 'donut' ? 45 : 0;
        return (
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={innerRadius}
                  outerRadius={70}
                  paddingAngle={2}
                  className="cursor-pointer"
                  onClick={(_: any, index: number) => {
                    const entry = data[index];
                    if (entry) {
                      setDashboardFilter({
                        columnId: statusColId ?? '',
                        value: entry.key,
                        label: entry.name,
                      });
                    }
                  }}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number, name: string) => [`${value} itens`, name]} />
                {resolvedConfig.chartType === 'donut' && (
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-xl font-bold">
                    {total}
                  </text>
                )}
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
      }

      if (data.length === 0) {
        return <p className="text-center text-muted-foreground py-8 font-density-cell">Sem dados</p>;
      }
      return (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => [`${value} itens`, 'Quantidade']} />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              className="cursor-pointer"
              onClick={(_: any, index: number) => {
                const entry = data[index];
                if (entry) {
                  setDashboardFilter({
                    columnId: statusColId ?? '',
                    value: entry.key,
                    label: entry.name,
                  });
                }
              }}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'line_chart': {
      const dateRange = resolvedConfig.dateRange ?? 'last_14';
      const days = DATE_RANGE_DAYS[dateRange] ?? 14;
      const now = new Date();
      const dayBuckets: { date: string; count: number; fullDate: string }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(5, 10);
        dayBuckets.push({ date: key, count: 0, fullDate: d.toISOString().slice(0, 10) });
      }
      for (const item of filteredItems) {
        if (!item.createdAt) continue;
        const d = new Date(item.createdAt);
        const key = d.toISOString().slice(5, 10);
        const bucket = dayBuckets.find(b => b.date === key);
        if (bucket) bucket.count++;
      }
      return (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={dayBuckets} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => [`${value}`, 'Itens criados']} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#5F3FFF"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{
                r: 5,
                className: 'cursor-pointer',
                onClick: (_: any, payload: any) => {
                  if (payload?.payload?.fullDate) {
                    setDashboardFilter({
                      columnId: '__created_at',
                      value: payload.payload.fullDate,
                      label: `Criados em ${payload.payload.date}`,
                    });
                  }
                },
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    case 'people_chart': {
      const peopleColumns = columns.filter(c => c.type === 'people');
      if (peopleColumns.length === 0) {
        return <p className="text-center text-muted-foreground py-8 font-density-cell">Nenhuma coluna de pessoa configurada</p>;
      }

      const countMap: Record<string, number> = {};
      for (const item of filteredItems) {
        for (const col of peopleColumns) {
          const val = item.columnValues[col.id]?.value;
          if (!val) continue;
          const ids = Array.isArray(val) ? val : [val];
          for (const id of ids) {
            countMap[String(id)] = (countMap[String(id)] || 0) + 1;
          }
        }
      }

      const personBarData = Object.entries(countMap).map(([id, count]) => {
        const profile = profiles.find(p => p.id === id);
        return {
          name: profile?.full_name || profile?.name || 'Desconhecido',
          count,
          id,
        };
      }).sort((a, b) => b.count - a.count);

      if (personBarData.length === 0) {
        return <p className="text-center text-muted-foreground py-8 font-density-cell">Sem dados de pessoas</p>;
      }

      return (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={personBarData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => [`${value} itens`, 'Quantidade']} />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              className="cursor-pointer"
              onClick={(_: any, index: number) => {
                const entry = personBarData[index];
                if (entry) {
                  const firstPeopleCol = peopleColumns[0];
                  setDashboardFilter({
                    columnId: firstPeopleCol.id,
                    value: entry.id,
                    label: entry.name,
                  });
                }
              }}
            >
              {personBarData.map((_, i) => (
                <Cell key={i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'table': {
      return (
        <TableWidget
          items={filteredItems}
          columns={columns}
          config={resolvedConfig}
          onItemClick={(item) => setSelectedItem(item)}
        />
      );
    }

    case 'numbers':
      return <NumbersWidget config={resolvedConfig} items={filteredItems} columns={columns} />;

    case 'progress':
      return <ProgressWidget config={resolvedConfig} items={filteredItems} columns={columns} groups={groups} />;

    case 'text':
      return <TextWidget config={resolvedConfig} onConfigChange={onConfigChange} />;

    case 'activity':
      return <ActivityWidget boardId={boardId} limit={resolvedConfig.limit || 20} />;

    default:
      return <p className="text-center text-muted-foreground py-8 font-density-cell">Widget desconhecido: {widget_type}</p>;
  }
};

export default React.memo(WidgetRenderer);
