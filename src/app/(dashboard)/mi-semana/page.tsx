'use client';

import { useState } from 'react';
import { useMiSemana, ItemSemana, DiaSemana } from '@/hooks/useMiSemana';
import { formatearEnZona, nombreDia } from '@/lib/timezone';

// ---------------------------------------------------------------------------
// Item Card Component
// ---------------------------------------------------------------------------

function ItemCard({ 
  item, 
  onComplete,
  showDate = false,
}: { 
  item: ItemSemana; 
  onComplete?: () => void;
  showDate?: boolean;
}) {
  const statusColors: Record<string, string> = {
    idea: 'bg-gray-100 text-gray-700',
    creacion: 'bg-blue-100 text-blue-700',
    diseno: 'bg-purple-100 text-purple-700',
    revision: 'bg-yellow-100 text-yellow-700',
    aprobado: 'bg-green-100 text-green-700',
    programado: 'bg-indigo-100 text-indigo-700',
    pending: 'bg-orange-100 text-orange-700',
    in_review: 'bg-yellow-100 text-yellow-700',
  };

  const tipoIcons: Record<string, string> = {
    contenido: '📱',
    entregable: '📦',
    tarea: '✓',
  };

  return (
    <div className="group flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
      {/* Checkbox for quick complete */}
      <button
        onClick={onComplete}
        className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 flex items-center justify-center transition-colors"
      >
        <span className="text-emerald-500 text-xs opacity-0 group-hover:opacity-100">✓</span>
      </button>

      {/* Client color indicator */}
      {item.clienteColor && (
        <div 
          className="w-1 h-10 rounded-full" 
          style={{ backgroundColor: item.clienteColor }}
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">{tipoIcons[item.tipo]}</span>
          <span className="font-medium text-gray-900 truncate">{item.titulo}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {item.cliente && (
            <span className="text-xs text-gray-500">{item.cliente}</span>
          )}
          {item.subtitulo && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-xs text-gray-500">{item.subtitulo}</span>
            </>
          )}
          {showDate && item.fecha && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-xs text-gray-500">
                {formatearEnZona(item.fecha, undefined, { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[item.estado] || 'bg-gray-100 text-gray-700'}`}>
        {item.estado}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day Column Component
// ---------------------------------------------------------------------------

function DayColumn({ 
  dia, 
  onComplete,
}: { 
  dia: DiaSemana; 
  onComplete: (item: ItemSemana) => void;
}) {
  return (
    <div className={`flex-1 min-w-[200px] ${dia.esHoy ? 'ring-2 ring-emerald-500 ring-offset-2' : ''} bg-gray-50 rounded-xl p-3`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className={`font-semibold capitalize ${dia.esHoy ? 'text-emerald-600' : 'text-gray-700'}`}>
            {dia.nombre}
          </h3>
          <p className="text-xs text-gray-500">
            {formatearEnZona(dia.fecha, undefined, { day: 'numeric', month: 'short' })}
          </p>
        </div>
        {dia.items.length > 0 && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            dia.esHoy ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
          }`}>
            {dia.items.length}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2">
        {dia.items.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-4">Sin pendientes</p>
        ) : (
          dia.items.map(item => (
            <ItemCard 
              key={item.id} 
              item={item} 
              onComplete={() => onComplete(item)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function MiSemanaPage() {
  const { data, loading, error, marcarCompletado, getCargaDelCrew } = useMiSemana();
  const [showCrew, setShowCrew] = useState(false);
  const [crewData, setCrewData] = useState<any[]>([]);

  const handleShowCrew = async () => {
    const carga = await getCargaDelCrew();
    setCrewData(carga);
    setShowCrew(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
        Error: {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Semana</h1>
          <p className="text-sm text-gray-500">
            {formatearEnZona(data.inicio, undefined, { dateStyle: 'long' })} — {formatearEnZona(data.fin, undefined, { dateStyle: 'long' })}
          </p>
        </div>
        <button
          onClick={handleShowCrew}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Ver carga del crew
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <p className="text-2xl font-bold text-gray-900">{data.resumen.total}</p>
          <p className="text-sm text-gray-500">Total pendiente</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <p className="text-2xl font-bold text-red-600">{data.resumen.atrasados}</p>
          <p className="text-sm text-gray-500">Atrasados</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <p className="text-2xl font-bold text-emerald-600">{data.resumen.publicaHoy}</p>
          <p className="text-sm text-gray-500">Publica hoy</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <p className="text-2xl font-bold text-gray-900">{data.resumen.completadosHoy}</p>
          <p className="text-sm text-gray-500">Completados hoy</p>
        </div>
      </div>

      {/* Overdue section */}
      {data.atrasado.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h2 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
            <span>⚠️</span>
            Atrasado ({data.atrasado.length})
          </h2>
          <div className="space-y-2">
            {data.atrasado.map(item => (
              <ItemCard 
                key={item.id} 
                item={item} 
                onComplete={() => marcarCompletado(item)}
                showDate
              />
            ))}
          </div>
        </div>
      )}

      {/* Week grid */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {data.dias.map(dia => (
            <DayColumn 
              key={dia.clave} 
              dia={dia} 
              onComplete={marcarCompletado}
            />
          ))}
        </div>
      </div>

      {/* No date section */}
      {data.sinFecha.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-3">
            Sin fecha asignada ({data.sinFecha.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {data.sinFecha.map(item => (
              <ItemCard 
                key={item.id} 
                item={item} 
                onComplete={() => marcarCompletado(item)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Crew workload modal */}
      {showCrew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCrew(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Carga del Crew</h2>
            <div className="space-y-3">
              {crewData.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay datos de carga</p>
              ) : (
                crewData.map(member => (
                  <div key={member.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{member.nombre}</p>
                      <p className="text-sm text-gray-500">
                        {member.estaSemana} esta semana • {member.atrasados > 0 && (
                          <span className="text-red-600">{member.atrasados} atrasados</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{member.total}</p>
                      <p className="text-xs text-gray-500">total</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setShowCrew(false)}
              className="mt-4 w-full py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
