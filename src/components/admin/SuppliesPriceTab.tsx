import React, { useState } from 'react';
import {
  DollarSign,
  Search,
  Filter,
  RotateCcw,
  Edit2,
  Check,
  X,
  Layers,
  Wrench,
  Home,
  Trees,
  ShieldAlert,
  HelpCircle,
  Save,
  CheckCircle2
} from 'lucide-react';
import { useAdminStore, SupplyItem, SupplyCategory } from '../../store/adminStore';

export function SuppliesPriceTab() {
  const { supplies, updateSupplyPrice, updateSupply, resetSuppliesToDefault } = useAdminStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | SupplyCategory>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editSupplier, setEditSupplier] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const categories: { id: 'all' | SupplyCategory; label: string; icon: any }[] = [
    { id: 'all', label: 'Todos los Insumos', icon: Filter },
    { id: 'melamina', label: 'Melaminas & Tableros', icon: Layers },
    { id: 'herrajes', label: 'Herrajes & Cantos', icon: Wrench },
    { id: 'sip', label: 'Paneles SIP (PROSIP)', icon: Home },
    { id: 'madera', label: 'Madera Estructural', icon: Trees },
    { id: 'fijaciones_sellantes', label: 'Fijaciones & Sellos', icon: DollarSign },
  ];

  const filteredSupplies = supplies.filter((s) => {
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.spec.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleStartEdit = (item: SupplyItem) => {
    setEditingId(item.id);
    setEditPrice(item.priceClp);
    setEditSupplier(item.supplier);
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = (id: string) => {
    updateSupply(id, {
      priceClp: Number(editPrice),
      supplier: editSupplier.trim(),
      notes: editNotes.trim(),
    });
    setEditingId(null);
    showToast('Precio actualizado correctamente en el sistema.');
  };

  const handleResetDefaults = () => {
    if (window.confirm('¿Restablecer todos los precios y costos de insumos a valores predeterminados de fábrica?')) {
      resetSuppliesToDefault();
      showToast('Precios de fábrica restaurados.');
    }
  };

  const getCategoryBadge = (cat: SupplyCategory) => {
    switch (cat) {
      case 'melamina':
        return <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded text-[9px] font-bold uppercase">Melaminas</span>;
      case 'herrajes':
        return <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[9px] font-bold uppercase">Herrajes</span>;
      case 'sip':
        return <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded text-[9px] font-bold uppercase">Paneles SIP</span>;
      case 'madera':
        return <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold uppercase">Madera IPV</span>;
      case 'fijaciones_sellantes':
        return <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-[9px] font-bold uppercase">Fijaciones/Sellos</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {feedback && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} />
          {feedback}
        </div>
      )}

      {/* Info Notice */}
      <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-start justify-between gap-4 text-xs">
        <div className="flex items-start gap-2.5">
          <DollarSign size={18} className="text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-white">Impacto en Presupuestos y Cubicaciones</p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Cualquier cambio de costo unitario impacta inmediatamente en las estimaciones de costo, planillas Excel de fabricación y reportes técnicos de todos los módulos.
            </p>
          </div>
        </div>
        <button
          onClick={handleResetDefaults}
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
          title="Restaurar precios iniciales"
        >
          <RotateCcw size={13} /> Restaurar Fábrica
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, nombre de insumo, proveedor o especificación..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 overflow-x-auto">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-orange-500 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-zinc-900'
                }`}
              >
                <Icon size={13} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Supplies Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5 pl-4">Código & Insumo</th>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5">Especificación Técnica</th>
                <th className="p-3.5">Unidad</th>
                <th className="p-3.5">Proveedor</th>
                <th className="p-3.5 text-right">Precio Unitario (CLP)</th>
                <th className="p-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredSupplies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No se encontraron insumos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredSupplies.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                      {/* Name & Code */}
                      <td className="p-3.5 pl-4 font-semibold text-white">
                        <div className="font-mono text-[10px] text-orange-400 font-bold">{item.code}</div>
                        <div className="text-xs text-slate-200">{item.name}</div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5 whitespace-nowrap">{getCategoryBadge(item.category)}</td>

                      {/* Spec */}
                      <td className="p-3.5 text-slate-400 text-[11px] max-w-xs">{item.spec}</td>

                      {/* Unit */}
                      <td className="p-3.5 text-slate-300 font-mono text-[11px] whitespace-nowrap">{item.unit}</td>

                      {/* Supplier */}
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editSupplier}
                            onChange={(e) => setEditSupplier(e.target.value)}
                            className="p-1 bg-zinc-950 border border-orange-500 rounded text-xs text-white w-full"
                          />
                        ) : (
                          item.supplier
                        )}
                      </td>

                      {/* Price */}
                      <td className="p-3.5 text-right font-mono font-bold whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-zinc-500">$</span>
                            <input
                              type="number"
                              min="0"
                              step="50"
                              value={editPrice}
                              onChange={(e) => setEditPrice(Number(e.target.value))}
                              className="p-1 w-28 bg-zinc-950 border border-orange-500 rounded text-xs text-right text-orange-400 font-bold"
                            />
                          </div>
                        ) : (
                          <span className="text-white text-sm">
                            ${item.priceClp.toLocaleString('es-CL')} <span className="text-[10px] text-zinc-500">CLP</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg"
                              title="Guardar precio"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-zinc-800 text-slate-400 hover:bg-zinc-700 rounded-lg"
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="px-2.5 py-1 bg-zinc-800/80 hover:bg-orange-500/20 text-slate-300 hover:text-orange-400 border border-zinc-700/60 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors mx-auto"
                          >
                            <Edit2 size={12} /> Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
