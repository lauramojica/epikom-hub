'use client';

import { useState, useEffect } from 'react';
import { 
  useContentCalendar, 
  ContentItem, 
  ContentStatus,
  STATUSES,
  CHANNELS,
  FORMATS,
} from '@/hooks/useContentCalendar';
import { formatearEnZona, rangoMes, claveDia, DEFAULT_TZ } from '@/lib/timezone';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = 'board' | 'calendar' | 'table';

// ---------------------------------------------------------------------------
// Board View Component
// ---------------------------------------------------------------------------

function BoardView({ 
  items, 
  onMove, 
  onSelect,
}: { 
  items: ContentItem[];
  onMove: (id: string, status: ContentStatus) => void;
  onSelect: (item: ContentItem) => void;
}) {
  const itemsByStatus = () => {
    const grouped: Record<ContentStatus, ContentItem[]> = {
      idea: [],
      creacion: [],
      diseno: [],
      revision: [],
      aprobado: [],
      programado: [],
      publicado: [],
    };
    
    items.forEach(item => {
      if (grouped[item.status]) {
        grouped[item.status].push(item);
      }
    });
    
    return grouped;
  };

  const grouped = itemsByStatus();

  // Simplified drag & drop
  const handleDragStart = (e: React.DragEvent, item: ContentItem) => {
    e.dataTransfer.setData('itemId', item.id);
  };

  const handleDrop = (e: React.DragEvent, status: ContentStatus) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    if (itemId) {
      onMove(itemId, status);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUSES.filter(s => s.value !== 'publicado').map(status => (
        <div
          key={status.value}
          className="flex-shrink-0 w-72 bg-gray-50 rounded-xl p-3"
          onDrop={e => handleDrop(e, status.value)}
          onDragOver={handleDragOver}
        >
          {/* Column header */}
          <div className="flex items-center justify-between mb-3">
            <span className={`px-2 py-1 text-xs font-medium rounded-lg ${status.color}`}>
              {status.label}
            </span>
            <span className="text-sm text-gray-500">{grouped[status.value].length}</span>
          </div>

          {/* Cards */}
          <div className="space-y-2">
            {grouped[status.value].map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={e => handleDragStart(e, item)}
                onClick={() => onSelect(item)}
                className="bg-white p-3 rounded-lg border border-gray-100 hover:border-gray-200 cursor-pointer shadow-sm hover:shadow transition-all"
              >
                {/* Client indicator */}
                <div className="flex items-center gap-2 mb-2">
                  {item.cliente_color && (
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: item.cliente_color }}
                    />
                  )}
                  <span className="text-xs text-gray-500">{item.cliente_nombre}</span>
                </div>

                {/* Title */}
                <p className="font-medium text-gray-900 text-sm line-clamp-2">{item.titulo}</p>

                {/* Meta */}
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  {item.canal && (
                    <span>{CHANNELS.find(c => c.value === item.canal)?.icon}</span>
                  )}
                  {item.formato && (
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded">{item.formato}</span>
                  )}
                  {item.publica_at && (
                    <span>{formatearEnZona(new Date(item.publica_at), DEFAULT_TZ, { day: 'numeric', month: 'short' })}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar View Component
// ---------------------------------------------------------------------------

function CalendarView({ 
  items,
  year,
  month,
  onSelect,
}: { 
  items: ContentItem[];
  year: number;
  month: number;
  onSelect: (item: ContentItem) => void;
}) {
  const { inicio, fin } = rangoMes(year, month, DEFAULT_TZ);
  
  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(firstDay).fill(null);
  
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  // Group items by day
  const itemsByDay: Record<string, ContentItem[]> = {};
  items.forEach(item => {
    if (item.publica_at) {
      const key = claveDia(new Date(item.publica_at), DEFAULT_TZ);
      if (!itemsByDay[key]) itemsByDay[key] = [];
      itemsByDay[key].push(item);
    }
  });

  const today = claveDia(new Date(), DEFAULT_TZ);
  const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {DAYS.map(day => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-100 last:border-0">
          {week.map((day, dayIndex) => {
            const dateKey = day ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
            const dayItems = dateKey ? itemsByDay[dateKey] || [] : [];
            const isToday = dateKey === today;

            return (
              <div 
                key={dayIndex} 
                className={`min-h-[100px] p-2 border-r border-gray-100 last:border-0 ${
                  !day ? 'bg-gray-50' : ''
                } ${isToday ? 'bg-emerald-50' : ''}`}
              >
                {day && (
                  <>
                    <span className={`text-sm font-medium ${
                      isToday ? 'text-emerald-600' : 'text-gray-700'
                    }`}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayItems.slice(0, 3).map(item => (
                        <div
                          key={item.id}
                          onClick={() => onSelect(item)}
                          className="text-xs p-1 rounded cursor-pointer hover:opacity-80 truncate"
                          style={{ 
                            backgroundColor: item.cliente_color ? `${item.cliente_color}20` : '#f3f4f6',
                            borderLeft: `3px solid ${item.cliente_color || '#9ca3af'}`,
                          }}
                        >
                          {item.titulo}
                        </div>
                      ))}
                      {dayItems.length > 3 && (
                        <div className="text-xs text-gray-500 pl-1">
                          +{dayItems.length - 3} más
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table View Component
// ---------------------------------------------------------------------------

function TableView({ 
  items,
  onSelect,
}: { 
  items: ContentItem[];
  onSelect: (item: ContentItem) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left p-3 text-sm font-medium text-gray-600">Título</th>
            <th className="text-left p-3 text-sm font-medium text-gray-600">Cliente</th>
            <th className="text-left p-3 text-sm font-medium text-gray-600">Estado</th>
            <th className="text-left p-3 text-sm font-medium text-gray-600">Canal</th>
            <th className="text-left p-3 text-sm font-medium text-gray-600">Formato</th>
            <th className="text-left p-3 text-sm font-medium text-gray-600">Publica</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr 
              key={item.id} 
              onClick={() => onSelect(item)}
              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
            >
              <td className="p-3">
                <div className="flex items-center gap-2">
                  {item.cliente_color && (
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: item.cliente_color }}
                    />
                  )}
                  <span className="font-medium text-gray-900">{item.titulo}</span>
                </div>
              </td>
              <td className="p-3 text-sm text-gray-600">{item.cliente_nombre}</td>
              <td className="p-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                  STATUSES.find(s => s.value === item.status)?.color || 'bg-gray-100'
                }`}>
                  {STATUSES.find(s => s.value === item.status)?.label || item.status}
                </span>
              </td>
              <td className="p-3 text-sm text-gray-600">
                {item.canal && CHANNELS.find(c => c.value === item.canal)?.icon}
              </td>
              <td className="p-3 text-sm text-gray-600">{item.formato}</td>
              <td className="p-3 text-sm text-gray-600">
                {item.publica_at && formatearEnZona(new Date(item.publica_at), DEFAULT_TZ, { 
                  day: 'numeric', 
                  month: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function ContenidoPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  const { 
    items, 
    clients, 
    loading, 
    error, 
    fetchBoardView, 
    fetchMonthView,
    moveItem,
  } = useContentCalendar();

  // Fetch data based on view mode
  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchMonthView(currentMonth.year, currentMonth.month, selectedClient || undefined);
    } else {
      fetchBoardView(selectedClient || undefined);
    }
  }, [viewMode, selectedClient, currentMonth, fetchBoardView, fetchMonthView]);

  const handleMove = async (id: string, status: ContentStatus) => {
    try {
      await moveItem(id, status);
    } catch (err) {
      console.error('Error moving item:', err);
    }
  };

  const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario de Contenido</h1>
          <p className="text-sm text-gray-500">
            {items.length} publicaciones
          </p>
        </div>

        <button className="px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors">
          + Nueva publicación
        </button>
      </div>

      {/* Filters and view toggle */}
      <div className="flex items-center justify-between gap-4">
        {/* Client filter */}
        <div className="flex items-center gap-4">
          <select
            value={selectedClient}
            onChange={e => setSelectedClient(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
          >
            <option value="">Todos los clientes</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.nombre}</option>
            ))}
          </select>

          {/* Month navigation (only for calendar view) */}
          {viewMode === 'calendar' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(m => ({
                  year: m.month === 1 ? m.year - 1 : m.year,
                  month: m.month === 1 ? 12 : m.month - 1,
                }))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ←
              </button>
              <span className="font-medium text-gray-700">
                {MONTHS[currentMonth.month - 1]} {currentMonth.year}
              </span>
              <button
                onClick={() => setCurrentMonth(m => ({
                  year: m.month === 12 ? m.year + 1 : m.year,
                  month: m.month === 12 ? 1 : m.month + 1,
                }))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { value: 'board', label: 'Board', icon: '▦' },
            { value: 'calendar', label: 'Calendario', icon: '📅' },
            { value: 'table', label: 'Tabla', icon: '☰' },
          ].map(view => (
            <button
              key={view.value}
              onClick={() => setViewMode(view.value as ViewMode)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === view.value 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="mr-1">{view.icon}</span>
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          Error: {error}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {viewMode === 'board' && (
            <BoardView 
              items={items} 
              onMove={handleMove}
              onSelect={setSelectedItem}
            />
          )}
          {viewMode === 'calendar' && (
            <CalendarView 
              items={items}
              year={currentMonth.year}
              month={currentMonth.month}
              onSelect={setSelectedItem}
            />
          )}
          {viewMode === 'table' && (
            <TableView 
              items={items}
              onSelect={setSelectedItem}
            />
          )}
        </>
      )}

      {/* Item detail modal (placeholder) */}
      {selectedItem && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{selectedItem.titulo}</h2>
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {selectedItem.cliente_color && (
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: selectedItem.cliente_color }}
                  />
                )}
                <span className="text-gray-600">{selectedItem.cliente_nombre}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                  STATUSES.find(s => s.value === selectedItem.status)?.color
                }`}>
                  {STATUSES.find(s => s.value === selectedItem.status)?.label}
                </span>
              </div>

              {selectedItem.copy && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Copy</label>
                  <p className="mt-1 text-gray-600 whitespace-pre-wrap">{selectedItem.copy}</p>
                </div>
              )}

              {selectedItem.publica_at && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha de publicación</label>
                  <p className="mt-1 text-gray-600">
                    {formatearEnZona(new Date(selectedItem.publica_at), DEFAULT_TZ, { 
                      dateStyle: 'full', 
                      timeStyle: 'short' 
                    })}
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                {selectedItem.canal && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Canal</label>
                    <p className="mt-1 text-gray-600">
                      {CHANNELS.find(c => c.value === selectedItem.canal)?.icon} {selectedItem.canal}
                    </p>
                  </div>
                )}
                {selectedItem.formato && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Formato</label>
                    <p className="mt-1 text-gray-600">{selectedItem.formato}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button className="flex-1 px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600">
                Editar
              </button>
              <button className="px-4 py-2 text-gray-600 font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
                Duplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
