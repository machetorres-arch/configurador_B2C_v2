import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  X, 
  Check, 
  AlertTriangle, 
  Building2, 
  Home, 
  ShieldCheck, 
  Sparkles, 
  Scissors, 
  Flame, 
  Droplet, 
  Info,
  Maximize2,
  Search
} from 'lucide-react';
import { useKitchenStore } from '../../store/kitchenStore';
import { QSTONE_SINKS, FDV_COOKTOPS, SinkModelId, CooktopModelId } from '../../types/countertop';
import { generateCountertopPieces, detectContinuousCabinetRuns } from '../../utils/countertopNesting';

interface CountertopConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight?: boolean;
}

export function CountertopConfigModal({ isOpen, onClose, isLight: isLightProp }: CountertopConfigModalProps) {
  const isLight = isLightProp ?? (typeof window !== 'undefined' && localStorage.getItem('arquify_kitchen_theme') === 'light');

  const {
    countertopConfig,
    setCountertopConfig,
    qstoneCatalog,
    cabinets,
    activeCabinetId,
    setCountertopSink,
    setCountertopCooktop,
    validateCabinetForSink,
    validateCabinetForCooktop,
    golaSystem,
    setGolaIncompatibilityAlert,
    islandBackConfig,
    setIslandBackConfig,
    walls,
    architecturalElements,
    roomConfig,
  } = useKitchenStore();

  const [activeTab, setActiveTab] = useState<'material' | 'dimensions' | 'appliances' | 'nesting'>('material');
  const [applianceError, setApplianceError] = useState<string | null>(null);
  const [materialFilter, setMaterialFilter] = useState<'all' | 'quarzo' | 'sinterizado'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCatalog = useMemo(() => {
    return qstoneCatalog.filter((product) => {
      const matchesType = materialFilter === 'all' || product.materialType === materialFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || product.name.toLowerCase().includes(q) || product.code.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [qstoneCatalog, materialFilter, searchQuery]);

  const selectedProduct = useMemo(() => {
    return qstoneCatalog.find((p) => p.id === countertopConfig.selectedProductId) || qstoneCatalog[0];
  }, [countertopConfig.selectedProductId, qstoneCatalog]);

  const nestingBOM = useMemo(() => {
    return generateCountertopPieces(cabinets, countertopConfig, qstoneCatalog, islandBackConfig, walls, architecturalElements, roomConfig);
  }, [cabinets, countertopConfig, qstoneCatalog, islandBackConfig, walls, architecturalElements, roomConfig]);

  const continuousRuns = useMemo(() => {
    return detectContinuousCabinetRuns(cabinets, countertopConfig, walls, architecturalElements, roomConfig);
  }, [cabinets, countertopConfig, walls, architecturalElements, roomConfig]);

  const baseAndIslandCabs = useMemo(() => {
    return cabinets.filter(
      (c) => (c.type === 'base' || c.type === 'island') && !c.variant?.startsWith('deco_')
    );
  }, [cabinets]);

  const canAnyWaterfallLeft = useMemo(() => {
    if (!nestingBOM?.runs || nestingBOM.runs.length === 0) return true;
    return nestingBOM.runs.some((r) => r.canWaterfallLeft);
  }, [nestingBOM]);

  const canAnyWaterfallRight = useMemo(() => {
    if (!nestingBOM?.runs || nestingBOM.runs.length === 0) return true;
    return nestingBOM.runs.some((r) => r.canWaterfallRight);
  }, [nestingBOM]);

  const hasIslands = useMemo(() => {
    return cabinets.some((c) => c.type === 'island');
  }, [cabinets]);

  if (!isOpen) return null;

  const handleSelectProduct = (productId: string) => {
    setCountertopConfig({ selectedProductId: productId, enabled: true });
  };

  const handleSinkChange = (sinkId: SinkModelId) => {
    setApplianceError(null);
    if (sinkId === 'none') {
      setCountertopSink('none');
      return;
    }
    // Try to install on currently active cabinet if valid, else first valid cabinet
    const activeCab = cabinets.find((c) => c.id === activeCabinetId);
    if (activeCab && (activeCab.type === 'base' || activeCab.type === 'island')) {
      const res = setCountertopSink(sinkId, activeCab.id);
      if (!res.success) {
        setApplianceError(res.error || 'Error de validación');
      }
      return;
    }

    // Auto-pick first eligible cabinet
    const eligible = baseAndIslandCabs.find(
      (c) => validateCabinetForSink(c, sinkId).valid
    );
    if (eligible) {
      setCountertopSink(sinkId, eligible.id);
    } else {
      const spec = QSTONE_SINKS[sinkId];
      setApplianceError(
        `No hay ningún mueble base con ancho suficiente (mínimo ${spec.minCabinetWidthCm} cm) para la cubeta ${spec.name}. Modifica el ancho de un mueble a >= ${spec.minCabinetWidthCm} cm.`
      );
    }
  };

  const handleCooktopChange = (cooktopId: CooktopModelId) => {
    setApplianceError(null);
    if (cooktopId === 'none') {
      setCountertopCooktop('none');
      return;
    }
    const activeCab = cabinets.find((c) => c.id === activeCabinetId);
    if (activeCab && (activeCab.type === 'base' || activeCab.type === 'island')) {
      const res = setCountertopCooktop(cooktopId, activeCab.id);
      if (!res.success) {
        setApplianceError(res.error || 'Error de validación');
      }
      return;
    }

    // Auto-pick first eligible cabinet
    const eligible = baseAndIslandCabs.find(
      (c) => c.id !== countertopConfig.sinkCabinetId && validateCabinetForCooktop(c, cooktopId).valid
    );
    if (eligible) {
      setCountertopCooktop(cooktopId, eligible.id);
    } else {
      const spec = FDV_COOKTOPS[cooktopId];
      setApplianceError(
        `No hay ningún mueble disponible con ancho suficiente (mínimo ${spec.minCabinetWidthCm} cm) para la encimera ${spec.name}.`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900 shadow-slate-900/10'
          : 'bg-slate-900 border-slate-700 text-white'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between transition-colors ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isLight
                ? 'bg-amber-100 border border-amber-300 text-amber-700'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
            }`}>
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-lg font-semibold tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`}>
                  Configurador de Cubiertas Qstone
                </h2>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                  isLight
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  Cuarzos & Sinterizados
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Marmolería técnica, regruesos, respaldos, cubetas bajo cubierta y optimización de corte
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className={`flex items-center gap-2 cursor-pointer text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
              isLight
                ? 'text-slate-700 bg-slate-100 border-slate-300 hover:bg-slate-200'
                : 'text-slate-300 bg-slate-800/80 border-slate-700 hover:bg-slate-800'
            }`}>
              <input
                type="checkbox"
                checked={countertopConfig.enabled}
                onChange={(e) => setCountertopConfig({ enabled: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Cubierta Activa</span>
            </label>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
                isLight
                  ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`flex border-b px-6 gap-2 text-xs font-medium transition-colors ${
          isLight ? 'border-slate-200 bg-slate-100/80' : 'border-slate-800 bg-slate-900/60'
        }`}>
          <button
            onClick={() => setActiveTab('material')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'material'
                ? isLight
                  ? 'border-orange-500 text-orange-600 font-bold'
                  : 'border-amber-400 text-amber-300 font-semibold'
                : isLight
                  ? 'border-transparent text-slate-600 hover:text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Catálogo Qstone ({qstoneCatalog.length})
          </button>
          <button
            onClick={() => setActiveTab('dimensions')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'dimensions'
                ? isLight
                  ? 'border-orange-500 text-orange-600 font-bold'
                  : 'border-amber-400 text-amber-300 font-semibold'
                : isLight
                  ? 'border-transparent text-slate-600 hover:text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Regrueso, Respaldo & Cascada
          </button>
          <button
            onClick={() => setActiveTab('appliances')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'appliances'
                ? isLight
                  ? 'border-orange-500 text-orange-600 font-bold'
                  : 'border-amber-400 text-amber-300 font-semibold'
                : isLight
                  ? 'border-transparent text-slate-600 hover:text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            Cubetas & Encimeras
          </button>
          <button
            onClick={() => setActiveTab('nesting')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'nesting'
                ? isLight
                  ? 'border-orange-500 text-orange-600 font-bold'
                  : 'border-amber-400 text-amber-300 font-semibold'
                : isLight
                  ? 'border-transparent text-slate-600 hover:text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            Despiece & Nesting de Disco
          </button>
        </div>

        {/* Content Body */}
        <div className={`flex-1 overflow-y-auto p-6 space-y-6 ${
          isLight ? 'bg-slate-50/60' : 'bg-slate-900/30'
        }`}>
          {/* TAB 1: MATERIAL & CATALOG */}
          {activeTab === 'material' && (
            <div className="space-y-4">
              <div className={`rounded-xl p-3 border flex items-start gap-3 transition-colors ${
                isLight
                  ? 'bg-amber-50/90 border-amber-200/80 text-slate-700'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
              }`}>
                <Info className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                <div className="text-xs leading-relaxed">
                  <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Regla de Fabricación Estructural:</span> Las cubiertas{' '}
                  <span className={`font-semibold ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>Sinterizadas (12 mm)</span> exigen{' '}
                  <span className={`underline ${isLight ? 'decoration-amber-500' : 'decoration-amber-400'}`}>tapa continua de melamina completa</span> en el
                  mueble base para dar soporte rígido homogéneo. Las de{' '}
                  <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>Cuarzo (18/20 mm)</span> utilizan el sistema tradicional de
                  barras de armado de 10 cm.
                </div>
              </div>

              {/* Filter and Search Toolbar */}
              <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-xl border transition-colors ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-700/60'
              }`}>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setMaterialFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                      materialFilter === 'all'
                        ? isLight ? 'bg-amber-500 text-white font-bold shadow' : 'bg-amber-500 text-slate-950 font-bold shadow'
                        : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Todos ({qstoneCatalog.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaterialFilter('quarzo')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                      materialFilter === 'quarzo'
                        ? 'bg-cyan-600 text-white font-bold shadow'
                        : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Cuarzo ({qstoneCatalog.filter((p) => p.materialType === 'quarzo').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaterialFilter('sinterizado')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                      materialFilter === 'sinterizado'
                        ? 'bg-purple-600 text-white font-bold shadow'
                        : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Sinterizado ({qstoneCatalog.filter((p) => p.materialType === 'sinterizado').length})
                  </button>
                </div>

                <div className="relative">
                  <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                    isLight ? 'text-slate-400' : 'text-slate-400'
                  }`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre o código..."
                    className={`w-full sm:w-64 pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none transition ${
                      isLight
                        ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white'
                        : 'bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-400 focus:border-amber-400'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold cursor-pointer ${
                        isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {filteredCatalog.length === 0 ? (
                <div className={`py-12 text-center text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  No se encontraron decorativos con los criterios seleccionados.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredCatalog.map((product) => {
                    const isSelected = countertopConfig.selectedProductId === product.id;
                    const isSintered = product.materialType === 'sinterizado';

                    return (
                      <div
                        key={product.id}
                        onClick={() => handleSelectProduct(product.id)}
                        className={`relative p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? isLight
                              ? 'border-orange-500 bg-orange-50/70 shadow-md ring-1 ring-orange-500'
                              : 'border-amber-400 bg-amber-950/20 shadow-lg shadow-amber-950/30'
                            : isLight
                              ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                              : 'border-slate-700/80 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-12 h-12 rounded-lg shadow-inner border border-black/10 shrink-0 flex items-center justify-center text-xs font-bold overflow-hidden relative"
                              style={{ backgroundColor: product.colorHex }}
                            >
                              {product.textureUrl && !product.textureUrl.startsWith('#') ? (
                                <img
                                  src={product.textureUrl}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-[11px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                  {product.thicknessMm}mm
                                </span>
                              )}
                            </div>
                            <div>
                              <div className={`text-sm font-semibold flex items-center gap-1.5 ${
                                isLight ? 'text-slate-900' : 'text-white'
                              }`}>
                                {product.name}
                                {isSelected && <Check className={`w-4 h-4 ${isLight ? 'text-orange-600' : 'text-amber-400'}`} />}
                              </div>
                              <div className={`text-xs flex items-center gap-2 mt-0.5 ${
                                isLight ? 'text-slate-500' : 'text-slate-400'
                              }`}>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                    isSintered
                                      ? isLight
                                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                        : 'bg-purple-900/60 text-purple-300 border border-purple-700'
                                      : isLight
                                        ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                                        : 'bg-cyan-900/60 text-cyan-300 border border-cyan-700'
                                  }`}
                                >
                                  {isSintered ? 'Sinterizado' : 'Cuarzo'}
                                </span>
                                <span>{product.thicknessMm} mm</span>
                                <span>• Cod: {product.code}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-bold ${isLight ? 'text-orange-600' : 'text-amber-400'}`}>
                              ${product.priceM2Clp.toLocaleString('es-CL')}
                            </div>
                            <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>por m² c/IVA</div>
                          </div>
                        </div>

                        {/* Technical note banner */}
                        <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] ${
                          isLight ? 'border-slate-100' : 'border-slate-700/50'
                        }`}>
                          <span className={isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}>
                            {isSintered ? 'Requiere Tapa Melamina Completa' : 'Sistema Barras 10 cm'}
                          </span>
                          <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>
                            Formato: {(product.sheetWidthMm / 10).toFixed(0)}x{(product.sheetHeightMm / 10).toFixed(0)} cm ({( (product.sheetWidthMm * product.sheetHeightMm) / 1000000 ).toFixed(2)} m²)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DIMENSIONS, REGRUESO & WATERFALL */}
          {activeTab === 'dimensions' && (
            <div className="space-y-6">
              {/* Regrueso delantero (Faldón) */}
              <div className={`rounded-xl p-4 border transition-colors ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/40 border-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-sm font-semibold flex items-center gap-2 ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    <span>Regrueso Frontal (Faldón Delantero)</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      isLight ? 'text-amber-800 bg-amber-100 border-amber-200' : 'text-amber-400 bg-amber-400/10 border-amber-400/30'
                    }`}>
                      {countertopConfig.regruesoCm} cm
                    </span>
                  </label>
                  <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Rango: 0 a 5 cm (paso 1 cm)</span>
                </div>
                <p className={`text-xs mb-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  El regrueso crea un frente visualmente robusto. Modifica y deduce automáticamente la altura de puertas y frentes de cajón para garantizar una apertura ergonómica y despejada bajo la cubierta.
                </p>

                {golaSystem !== 'none' && (
                  <div className={`mb-3 px-3 py-2 rounded-lg text-[11px] flex items-center justify-between border ${
                    isLight
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}>
                    <span>
                      <strong>Riel Gola activo ({golaSystem === 'black' ? 'Negro' : 'Aluminio'}):</strong> Regrueso máximo permitido{' '}
                      <strong>{Number(((selectedProduct?.thicknessMm || 20) / 10 + 2.0).toFixed(1))} cm</strong> (Espesor {(selectedProduct?.thicknessMm || 20) / 10} cm + 2 cm).
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-6 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((val) => {
                    const stoneThicknessCm = (selectedProduct?.thicknessMm || 20) / 10;
                    const isBlocked = golaSystem !== 'none' && val > stoneThicknessCm + 2.0;

                    return (
                      <button
                        key={val}
                        onClick={() => {
                          if (isBlocked) {
                            setGolaIncompatibilityAlert({
                              isOpen: true,
                              regruesoCm: val,
                              stoneThicknessCm,
                              attemptedAction: 'regrueso',
                            });
                            return;
                          }
                          setCountertopConfig({ regruesoCm: val });
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition relative cursor-pointer ${
                          countertopConfig.regruesoCm === val
                            ? isLight ? 'bg-orange-500 text-white border-orange-600 shadow-sm' : 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : isBlocked
                            ? isLight ? 'bg-red-50 text-slate-400 border-dashed border-red-300 hover:border-amber-400' : 'bg-slate-900/60 text-slate-500 border-dashed border-red-500/40 hover:border-amber-400 hover:text-amber-300'
                            : isLight ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                        title={isBlocked ? `Incompatible con Riel Gola (excede ${stoneThicknessCm + 2} cm)` : undefined}
                      >
                        {val === 0 ? 'Sin faldón (0 cm)' : `${val} cm`}
                        {isBlocked && (
                          <span className={`block text-[9px] font-normal mt-0.5 ${isLight ? 'text-red-500' : 'text-red-400'}`}>
                            Bloquea Gola
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Respaldo / Salpicadero */}
              <div className={`rounded-xl p-4 border transition-colors ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/40 border-slate-700'
              }`}>
                <label className={`text-sm font-semibold block mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Respaldo Posterior (Salpicadero contra Muro)
                </label>
                <p className={`text-xs mb-3 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Protección de muro en el mismo material de cuarzo o piedra sinterizada.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setCountertopConfig({ backsplashMode: 'none' })}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      countertopConfig.backsplashMode === 'none'
                        ? isLight ? 'border-orange-500 bg-orange-50/70 text-slate-900 ring-1 ring-orange-500 shadow-sm' : 'border-amber-400 bg-amber-950/20 text-white'
                        : isLight ? 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>Sin Respaldo</div>
                    <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Directo a pintura o cerámica</div>
                  </button>

                  <button
                    onClick={() => setCountertopConfig({ backsplashMode: 'standard_5cm' })}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      countertopConfig.backsplashMode === 'standard_5cm'
                        ? isLight ? 'border-orange-500 bg-orange-50/70 text-slate-900 ring-1 ring-orange-500 shadow-sm' : 'border-amber-400 bg-amber-950/20 text-white'
                        : isLight ? 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>Zócalo Estándar (5 cm)</div>
                    <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tira perimetral de 50 mm</div>
                  </button>

                  <button
                    onClick={() => setCountertopConfig({ backsplashMode: 'full_height' })}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      countertopConfig.backsplashMode === 'full_height'
                        ? isLight ? 'border-orange-500 bg-orange-50/70 text-slate-900 ring-1 ring-orange-500 shadow-sm' : 'border-amber-400 bg-amber-950/20 text-white'
                        : isLight ? 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>Revestimiento Completo</div>
                    <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Cubre hasta muebles aéreos (55 cm)</div>
                  </button>
                </div>
              </div>

              {/* Logística de Instalación & Restricción de Largo */}
              <div className={`rounded-xl p-4 border transition-colors ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/40 border-slate-700'
              }`}>
                <label className={`text-sm font-semibold block mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Logística de Transporte & Tipología de Edificación
                </label>
                <p className={`text-xs mb-3 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Para casas el largo máximo por pieza es <strong className={isLight ? 'text-slate-800' : 'text-white'}>250 cm</strong>. Para edificios
                  (paso por ascensor/escaleras) es <strong className={isLight ? 'text-slate-800' : 'text-white'}>200 cm</strong>. Las uniones se realizan
                  estrictamente a <strong className={isLight ? 'text-amber-700' : 'text-amber-400'}>90° ortogonales</strong> (no en 45°).
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCountertopConfig({ buildingType: 'casa' })}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition cursor-pointer ${
                      countertopConfig.buildingType === 'casa'
                        ? isLight ? 'border-orange-500 bg-orange-50/70 text-slate-900 ring-1 ring-orange-500 shadow-sm' : 'border-amber-400 bg-amber-950/20 text-white'
                        : isLight ? 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Home className={`w-5 h-5 ${isLight ? 'text-orange-600' : 'text-amber-400'}`} />
                    <div>
                      <div className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Instalación en Casa</div>
                      <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tramos continuos máx 250 cm</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setCountertopConfig({ buildingType: 'edificio' })}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition cursor-pointer ${
                      countertopConfig.buildingType === 'edificio'
                        ? isLight ? 'border-orange-500 bg-orange-50/70 text-slate-900 ring-1 ring-orange-500 shadow-sm' : 'border-amber-400 bg-amber-950/20 text-white'
                        : isLight ? 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Building2 className={`w-5 h-5 ${isLight ? 'text-orange-600' : 'text-amber-400'}`} />
                    <div>
                      <div className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Instalación en Edificio</div>
                      <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tramos continuos máx 200 cm</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Cascada (Waterfall) & Voladizo de Isla */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`rounded-xl p-4 border space-y-3 transition-colors ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/40 border-slate-700'
                }`}>
                  <span className={`text-sm font-semibold block ${isLight ? 'text-slate-900' : 'text-white'}`}>Remates Laterales en Cascada</span>
                  <div className={`flex flex-col sm:flex-row gap-3 text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    <label 
                      className={`flex items-center gap-2 ${canAnyWaterfallLeft ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                      title={!canAnyWaterfallLeft ? 'No permitido: hay mueble de despensa o esquina adyacente' : undefined}
                    >
                      <input
                        type="checkbox"
                        disabled={!canAnyWaterfallLeft}
                        checked={countertopConfig.waterfallLeft && canAnyWaterfallLeft}
                        onChange={(e) => setCountertopConfig({ waterfallLeft: e.target.checked })}
                        className="rounded text-amber-500"
                      />
                      <span>Cascada Izq. {!canAnyWaterfallLeft && <span className={`text-[10px] block sm:inline ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>(Bloqueada por despensa)</span>}</span>
                    </label>
                    <label 
                      className={`flex items-center gap-2 ${canAnyWaterfallRight ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                      title={!canAnyWaterfallRight ? 'No permitido: hay mueble de despensa o esquina adyacente' : undefined}
                    >
                      <input
                        type="checkbox"
                        disabled={!canAnyWaterfallRight}
                        checked={countertopConfig.waterfallRight && canAnyWaterfallRight}
                        onChange={(e) => setCountertopConfig({ waterfallRight: e.target.checked })}
                        className="rounded text-amber-500"
                      />
                      <span>Cascada Der. {!canAnyWaterfallRight && <span className={`text-[10px] block sm:inline ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>(Bloqueada por despensa)</span>}</span>
                    </label>
                  </div>
                </div>

                <div className={`rounded-xl p-4 border transition-colors ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/40 border-slate-700'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Voladizo de Barra en Isla</span>
                    <span className={`text-xs font-bold ${isLight ? 'text-orange-600' : 'text-amber-400'}`}>{countertopConfig.islandOverhangCm} cm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="5"
                    value={countertopConfig.islandOverhangCm}
                    onChange={(e) => setCountertopConfig({ islandOverhangCm: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className={`flex justify-between text-[10px] mt-1 ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>
                    <span>0 cm</span>
                    <span>25 cm (estándar)</span>
                    <span>40 cm</span>
                  </div>
                </div>

                {/* Placa Trasera Exterior de Isla en Piedra Qstone (Solo si hay muebles Isla) */}
                {hasIslands && (
                  <div className={`col-span-1 md:col-span-2 rounded-xl p-4 border transition-colors ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/40 border-slate-700'
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold block ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            Placa Trasera Exterior en Piedra Qstone (Solo Muebles Isla)
                          </span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-500 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                            Exclusivo Isla
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          Placa adicional adosada que forra la espalda exterior de los muebles isla con el mismo cuarzo o piedra sinterizada, descendiendo a piso. No aplica a muebles base contra muro ni aéreos.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const isCountertopActive = islandBackConfig.enabled && islandBackConfig.materialType === 'countertop';
                          setIslandBackConfig({
                            enabled: !isCountertopActive,
                            materialType: 'countertop',
                            heightMode: 'to_floor',
                          });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          islandBackConfig.enabled && islandBackConfig.materialType === 'countertop'
                            ? 'bg-amber-500'
                            : isLight ? 'bg-slate-300' : 'bg-white/20'
                        }`}
                        role="switch"
                        aria-checked={islandBackConfig.enabled && islandBackConfig.materialType === 'countertop'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            islandBackConfig.enabled && islandBackConfig.materialType === 'countertop' ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    {islandBackConfig.enabled && islandBackConfig.materialType === 'countertop' && (
                      <div className={`mt-3 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                        isLight ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}>
                        <Sparkles size={14} className="shrink-0" />
                        <span>
                          Placa trasera exterior activada en <strong>{selectedProduct.name}</strong> hasta el piso (sin zócalo). Se incluye en la cubicación y nesting de planchas.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Remate y Extensión Seleccionable hacia Muro o Pilar */}
                <div className={`col-span-1 md:col-span-2 rounded-xl p-4 border transition-colors ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/40 border-slate-700'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Maximize2 className={`w-4 h-4 ${isLight ? 'text-orange-600' : 'text-amber-400'}`} />
                      <span className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Extensión de Cubierta hacia Muro o Pilar
                      </span>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                      isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-300'
                    }`}>
                      Ajuste de obra
                    </span>
                  </div>

                  <p className={`text-xs mb-3 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Por defecto las cubiertas terminan exactamente donde termina el mueble. Activa estas opciones si deseas que la cubierta se prolongue automáticamente hasta topar con un muro o pilar cercano (ideal para cubrir el espacio libre del lavavajillas eléctrico o cerrar vanos entre muebles y muros).
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      countertopConfig.extendToWallLeft
                        ? isLight ? 'bg-orange-50/70 border-orange-300 text-slate-900' : 'bg-amber-950/20 border-amber-500/50 text-white'
                        : isLight ? 'bg-slate-50/60 border-slate-200 text-slate-700' : 'bg-slate-800/40 border-slate-700 text-slate-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={countertopConfig.extendToWallLeft ?? false}
                        onChange={(e) => setCountertopConfig({ extendToWallLeft: e.target.checked })}
                        className="rounded text-amber-500 accent-amber-500"
                      />
                      <div>
                        <div className="text-xs font-semibold">Extender Extremo Izquierdo a Muro/Pilar</div>
                        <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          Cierra a tope con el muro o pilar de la izquierda
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      countertopConfig.extendToWallRight
                        ? isLight ? 'bg-orange-50/70 border-orange-300 text-slate-900' : 'bg-amber-950/20 border-amber-500/50 text-white'
                        : isLight ? 'bg-slate-50/60 border-slate-200 text-slate-700' : 'bg-slate-800/40 border-slate-700 text-slate-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={countertopConfig.extendToWallRight ?? false}
                        onChange={(e) => setCountertopConfig({ extendToWallRight: e.target.checked })}
                        className="rounded text-amber-500 accent-amber-500"
                      />
                      <div>
                        <div className="text-xs font-semibold">Extender Extremo Derecho a Muro/Pilar</div>
                        <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          Cierra a tope con el muro o pilar de la derecha
                        </div>
                      </div>
                    </label>
                  </div>

                  {(countertopConfig.extendToWallLeft || countertopConfig.extendToWallRight) && (
                    <div className={`p-3.5 rounded-lg border space-y-3.5 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-700/60'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          Distancia Máxima de Búsqueda de Muro/Pilar:
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="10"
                            max="300"
                            step="5"
                            value={countertopConfig.extendToWallMaxGapCm ?? 50}
                            onChange={(e) => setCountertopConfig({ extendToWallMaxGapCm: Math.max(10, Math.min(300, Number(e.target.value))) })}
                            className={`w-16 px-2 py-0.5 text-xs text-right font-bold rounded border ${
                              isLight ? 'bg-white border-slate-300 text-orange-600' : 'bg-slate-800 border-slate-700 text-amber-400'
                            }`}
                          />
                          <span className={`text-xs font-bold ${isLight ? 'text-orange-600' : 'text-amber-400'}`}>cm</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="300"
                        step="5"
                        value={countertopConfig.extendToWallMaxGapCm ?? 50}
                        onChange={(e) => setCountertopConfig({ extendToWallMaxGapCm: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <div className={`flex justify-between text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>10 cm</span>
                        <span>60 cm (lavavajillas)</span>
                        <span>150 cm</span>
                        <span>300 cm (muro distante)</span>
                      </div>

                      {/* Botones de ajuste rápido de distancia */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Ajuste rápido:</span>
                        {[50, 60, 95, 150, 200, 300].map((presetCm) => (
                          <button
                            key={presetCm}
                            type="button"
                            onClick={() => setCountertopConfig({ extendToWallMaxGapCm: presetCm })}
                            className={`text-[10px] px-2 py-0.5 rounded border transition ${
                              (countertopConfig.extendToWallMaxGapCm ?? 50) === presetCm
                                ? isLight
                                  ? 'bg-orange-500 text-white border-orange-600 font-bold'
                                  : 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                                : isLight
                                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {presetCm} cm
                          </button>
                        ))}
                      </div>

                      {/* Diagnóstico en tiempo real de muros detectados */}
                      <div className={`p-2.5 rounded border text-[11px] space-y-1.5 ${
                        isLight ? 'bg-white border-slate-200' : 'bg-slate-950/60 border-slate-800'
                      }`}>
                        <div className="font-semibold flex items-center justify-between">
                          <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Estado de detección en el proyecto:</span>
                          <span className="text-[10px] opacity-70">Rango activo: {countertopConfig.extendToWallMaxGapCm ?? 50} cm</span>
                        </div>
                        {continuousRuns.map((r, rIdx) => {
                          const extL = (r.extensionToWallLeftMm || 0) / 10;
                          const extR = (r.extensionToWallRightMm || 0) / 10;
                          return (
                            <div key={r.id || rIdx} className="space-y-1 border-t border-black/5 pt-1">
                              <div className="font-medium text-amber-500 text-[10px] uppercase">{r.name}:</div>
                              {countertopConfig.extendToWallLeft && (
                                <div className="flex items-center gap-1.5">
                                  {extL > 0 ? (
                                    <>
                                      <span className="text-emerald-500 font-bold">✓</span>
                                      <span className={isLight ? 'text-emerald-800' : 'text-emerald-300'}>
                                        Flanco Izquierdo: Muro detectado a <strong>{extL.toFixed(1)} cm</strong> (Cubierta extendida a tope)
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-amber-500 font-bold">⚠</span>
                                      <span className={isLight ? 'text-amber-800' : 'text-amber-300'}>
                                        Flanco Izquierdo: No se detectó muro a &le; {countertopConfig.extendToWallMaxGapCm ?? 50} cm. Si el muro está más lejos, aumenta el control a <strong>150 cm o 300 cm</strong>.
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                              {countertopConfig.extendToWallRight && (
                                <div className="flex items-center gap-1.5">
                                  {extR > 0 ? (
                                    <>
                                      <span className="text-emerald-500 font-bold">✓</span>
                                      <span className={isLight ? 'text-emerald-800' : 'text-emerald-300'}>
                                        Flanco Derecho: Muro detectado a <strong>{extR.toFixed(1)} cm</strong> (Cubierta extendida a tope)
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-amber-500 font-bold">⚠</span>
                                      <span className={isLight ? 'text-amber-800' : 'text-amber-300'}>
                                        Flanco Derecho: No se detectó muro a &le; {countertopConfig.extendToWallMaxGapCm ?? 50} cm. Si el muro está más lejos, aumenta el control a <strong>150 cm o 300 cm</strong>.
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-black/5 flex items-center justify-between">
                        <label className={`text-xs flex items-center gap-2 cursor-pointer ${
                          isLight ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                          <input
                            type="checkbox"
                            checked={countertopConfig.extendBaseOnly ?? true}
                            onChange={(e) => setCountertopConfig({ extendBaseOnly: e.target.checked })}
                            className="rounded text-amber-500 accent-amber-500"
                          />
                          <span>Aplicar solo a muebles base contra muro (mantener islas con remate libre)</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SINKS & COOKTOPS */}
          {activeTab === 'appliances' && (
            <div className="space-y-6">
              {applianceError && (
                <div className={`rounded-xl p-3 flex items-start gap-3 text-xs border ${
                  isLight
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-rose-950/40 border-rose-700/60 text-rose-300'
                }`}>
                  <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? 'text-red-600' : 'text-rose-400'}`} />
                  <div>{applianceError}</div>
                </div>
              )}

              {/* Cubetas Bajo Cubierta (Sysprotec / Qstone) */}
              <div className={`rounded-xl p-4 border transition-colors ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/40 border-slate-700'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Droplet className={`w-4 h-4 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
                  <span className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Cubeta Lavaplatos Bajo Cubierta</span>
                </div>
                <p className={`text-xs mb-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Instalación bajo cubierta con pulido perimetral de piedra y perforación con disco.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* None */}
                  <div
                    onClick={() => handleSinkChange('none')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      countertopConfig.sinkModel === 'none'
                        ? isLight ? 'border-orange-500 bg-orange-50/70 text-slate-900 ring-1 ring-orange-500 shadow-sm' : 'border-amber-400 bg-amber-950/20 text-white'
                        : isLight ? 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>Sin Cubeta</div>
                    <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Solo mesón ciego</div>
                  </div>

                  {/* ALFA ONEC 3018 */}
                  <div
                    onClick={() => handleSinkChange('alfa_onec_3018')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      countertopConfig.sinkModel === 'alfa_onec_3018'
                        ? isLight ? 'border-orange-500 bg-orange-50/70 text-slate-900 ring-1 ring-orange-500 shadow-sm' : 'border-amber-400 bg-amber-950/20 text-white'
                        : isLight ? 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>ALFA ONEC 3018</div>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        isLight ? 'bg-cyan-100 text-cyan-800' : 'bg-cyan-900/60 text-cyan-300'
                      }`}>1 Cubeta</span>
                    </div>
                    <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      77.5 x 48 cm (Prof. 23 cm)
                    </div>
                    <div className={`text-[10px] font-medium mt-1 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                      Encastre: 69.5 x 40 cm • Mueble mín: 80 cm
                    </div>
                  </div>

                  {/* ALFA TWOC F5858A */}
                  <div
                    onClick={() => handleSinkChange('alfa_twoc_f5858a')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      countertopConfig.sinkModel === 'alfa_twoc_f5858a'
                        ? isLight ? 'border-orange-500 bg-orange-50/70 text-slate-900 ring-1 ring-orange-500 shadow-sm' : 'border-amber-400 bg-amber-950/20 text-white'
                        : isLight ? 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>ALFA TWOC F5858A</div>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        isLight ? 'bg-cyan-100 text-cyan-800' : 'bg-cyan-900/60 text-cyan-300'
                      }`}>2 Cubetas</span>
                    </div>
                    <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      81.0 x 48 cm (Prof. 21 cm)
                    </div>
                    <div className={`text-[10px] font-medium mt-1 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                      Encastre: 73.0 x 40 cm • Mueble mín: 90 cm
                    </div>
                  </div>
                </div>
              </div>

              {/* Encimeras FDV */}
              <div className={`rounded-xl p-4 border transition-colors ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/40 border-slate-700'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Flame className={`w-4 h-4 ${isLight ? 'text-orange-600' : 'text-orange-400'}`} />
                  <span className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Encimera Sobre Cubierta (FDV)</span>
                </div>
                <p className={`text-xs mb-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Perforación de encastre rectangular para artefacto de cocción.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* None */}
                  <div
                    onClick={() => handleCooktopChange('none')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      countertopConfig.cooktopModel === 'none'
                        ? isLight ? 'border-orange-500 bg-orange-50/70 text-slate-900 ring-1 ring-orange-500 shadow-sm' : 'border-amber-400 bg-amber-950/20 text-white'
                        : isLight ? 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>Sin Encimera</div>
                    <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Sin perforación de gas</div>
                  </div>

                  {/* FDV DESIGN 60 2.0 */}
                  <div
                    onClick={() => handleCooktopChange('fdv_design_60')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      countertopConfig.cooktopModel === 'fdv_design_60'
                        ? isLight ? 'border-orange-500 bg-orange-50/70 text-slate-900 ring-1 ring-orange-500 shadow-sm' : 'border-amber-400 bg-amber-950/20 text-white'
                        : isLight ? 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>FDV DESIGN 60 2.0</div>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        isLight ? 'bg-orange-100 text-orange-800' : 'bg-orange-900/60 text-orange-300'
                      }`}>4 Platos</span>
                    </div>
                    <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      58 x 50 cm • Triple Corona
                    </div>
                    <div className={`text-[10px] font-medium mt-1 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                      Encastre: 55 x 47 cm • Mueble mín: 60 cm
                    </div>
                  </div>

                  {/* FDV DESIGN 90 */}
                  <div
                    onClick={() => handleCooktopChange('fdv_design_90')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      countertopConfig.cooktopModel === 'fdv_design_90'
                        ? isLight ? 'border-orange-500 bg-orange-50/70 text-slate-900 ring-1 ring-orange-500 shadow-sm' : 'border-amber-400 bg-amber-950/20 text-white'
                        : isLight ? 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>FDV DESIGN 90</div>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        isLight ? 'bg-orange-100 text-orange-800' : 'bg-orange-900/60 text-orange-300'
                      }`}>5 Platos Wok</span>
                    </div>
                    <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      86 x 50 cm • Acero Inoxidable
                    </div>
                    <div className={`text-[10px] font-medium mt-1 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                      Encastre: 84 x 47 cm • Mueble mín: 90 cm
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NESTING & BOM */}
          {activeTab === 'nesting' && (
            <div className="space-y-6">
              {!nestingBOM ? (
                <div className={`text-center py-12 text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Activa la cubierta y agrega al menos un mueble base para calcular el despiece y nesting.
                </div>
              ) : (
                <>
                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className={`p-3 rounded-xl border transition-colors ${
                      isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/50 border-slate-700'
                    }`}>
                      <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Área Neta Cubiertas</div>
                      <div className={`text-xl font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{nestingBOM.totalNetAreaM2} m²</div>
                      <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>En piezas instaladas</div>
                    </div>

                    <div className={`p-3 rounded-xl border transition-colors ${
                      isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/50 border-slate-700'
                    }`}>
                      <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Planchas 320x160cm</div>
                      <div className={`text-xl font-bold mt-1 ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>{nestingBOM.slabsCount} un</div>
                      <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                        {nestingBOM.grossBilledM2} m² brutos (5.12 m²/plancha)
                      </div>
                    </div>

                    <div className={`p-3 rounded-xl border transition-colors ${
                      isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/50 border-slate-700'
                    }`}>
                      <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Rendimiento Nesting</div>
                      <div className={`text-xl font-bold mt-1 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>{nestingBOM.efficiencyPercent}%</div>
                      <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Corte disco kerf 3.5mm</div>
                    </div>

                    <div className={`p-3 rounded-xl border transition-colors ${
                      isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/50 border-slate-700'
                    }`}>
                      <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Estimado Cubierta</div>
                      <div className={`text-xl font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        ${nestingBOM.totalCostClp.toLocaleString('es-CL')}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Material + elaboración</div>
                    </div>
                  </div>

                  {/* Cutout details */}
                  {nestingBOM.cutouts.length > 0 && (
                    <div className={`rounded-xl p-3.5 border transition-colors ${
                      isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/40 border-slate-700'
                    }`}>
                      <span className={`text-xs font-semibold block mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Perforaciones de Encastre y Procesamiento de Taller:
                      </span>
                      <div className={`space-y-1.5 text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        {nestingBOM.cutouts.map((c, i) => (
                          <div key={i} className={`flex items-center justify-between py-1 border-b ${
                            isLight ? 'border-slate-100' : 'border-slate-700/50'
                          }`}>
                            <span className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${isLight ? 'bg-orange-500' : 'bg-amber-400'}`}></span>
                              {c.modelName} ({c.type === 'sink' ? 'Lavaplatos Bajo Cubierta' : 'Encimera'})
                            </span>
                            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>
                              Corte: {c.cutoutWidthMm} x {c.cutoutDepthMm} mm • {c.polished ? 'Borde Pulido' : 'Corte Simple'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Continuous Runs & Logistics Criteria */}
                  <div className={`rounded-xl p-4 border transition-colors ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/40 border-slate-700'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Maximize2 className={`w-4 h-4 ${isLight ? 'text-orange-600' : 'text-amber-400'}`} />
                        <span className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Criterio de Despiece por Corrida Continua & Transporte:
                        </span>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded font-mono border ${
                        isLight
                          ? 'bg-amber-100 border-amber-200 text-amber-800'
                          : 'bg-amber-950/60 border-amber-800/60 text-amber-300'
                      }`}>
                        {countertopConfig.buildingType === 'edificio' ? 'Edificio: Máx 2000 mm' : 'Casa: Máx 2500 mm'}
                      </span>
                    </div>
                    <p className={`text-xs mb-3 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      El despiece calcula el largo total agrupado de la corrida continua en lugar de cortar por cada mueble individual, garantizando cubiertas enteras sin uniones innecesarias.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {nestingBOM.runs.map((run, rIdx) => (
                        <div key={rIdx} className={`p-2.5 rounded-lg border text-xs ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-700/80'
                        }`}>
                          <div className="flex justify-between items-center">
                            <span className={`font-semibold ${isLight ? 'text-orange-700' : 'text-amber-300'}`}>{run.name}</span>
                            <span className={`font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{run.cabinets.length} muebles</span>
                          </div>
                          <div className={`flex justify-between items-center mt-1 text-[11px] ${
                            isLight ? 'text-slate-600' : 'text-slate-400'
                          }`}>
                            <span>Largo Total: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{run.totalLengthMm} mm</strong></span>
                            <span>Prof: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{run.depthMm} mm</strong></span>
                            <span>Tramos: <strong className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>{run.segmentsCount} tramo(s)</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Visual 2D Slab Nesting Layout (Planchas 3200 x 1600 mm) */}
                  <div className={`rounded-xl border overflow-hidden ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/40 border-slate-700'
                  }`}>
                    <div className={`px-4 py-2.5 border-b text-xs font-semibold flex justify-between items-center ${
                      isLight ? 'bg-slate-100/90 border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Scissors className={`w-3.5 h-3.5 ${isLight ? 'text-orange-600' : 'text-amber-400'}`} />
                        <span>Optimización de Corte en Plancha Qstone (Formato 3200 x 1600 mm)</span>
                      </div>
                      <span className={`text-[11px] font-mono font-medium ${isLight ? 'text-orange-700' : 'text-amber-400'}`}>
                        {nestingBOM.slabsLayout.length} Plancha(s) • Kerf 3.5 mm
                      </span>
                    </div>

                    <div className="p-4 space-y-4">
                      {nestingBOM.slabsLayout.map((slab) => (
                        <div key={slab.slabIndex} className={`rounded-xl p-3 border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-700/80'
                        }`}>
                          <div className="flex justify-between items-center text-xs mb-2">
                            <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              Plancha #{slab.slabIndex} (3200 x 1600 mm)
                            </span>
                            <div className="flex items-center gap-3 text-[11px]">
                              <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                                Rendimiento: <strong className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>{slab.efficiencyPercent}%</strong>
                              </span>
                              <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                                Área Útil: <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>{slab.usedAreaM2} m²</strong>
                              </span>
                              <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                                Retazo: <strong className={isLight ? 'text-amber-700' : 'text-amber-400'}>{slab.offcutAreaM2} m²</strong>
                              </span>
                            </div>
                          </div>

                          <div className={`w-full overflow-x-auto rounded-lg p-2 flex justify-center ${
                            isLight ? 'bg-slate-100 border border-slate-200' : 'bg-slate-950'
                          }`}>
                            <svg
                              viewBox="-20 -20 3240 1640"
                              className={`w-full max-w-[820px] max-h-[380px] rounded border ${
                                isLight ? 'bg-slate-200/70 border-slate-300' : 'bg-slate-900 border-slate-700'
                              }`}
                              preserveAspectRatio="xMidYMid meet"
                            >
                              {/* Plancha Base */}
                              <rect x={0} y={0} width={3200} height={1600} fill={isLight ? '#e2e8f0' : '#1e293b'} stroke={isLight ? '#94a3b8' : '#475569'} strokeWidth={4} />

                              {/* Margen despunte 10mm */}
                              <rect x={10} y={10} width={3180} height={1580} fill="none" stroke={isLight ? '#64748b' : '#64748b'} strokeWidth={2} strokeDasharray="16,10" />

                              {/* Piezas anidadas */}
                              {slab.pieces.map((p, pi) => {
                                let fill = isLight ? '#d97706' : '#d97706';
                                let stroke = isLight ? '#b45309' : '#fbbf24';
                                if (p.type === 'apron') {
                                  fill = isLight ? '#ea580c' : '#ea580c';
                                  stroke = isLight ? '#c2410c' : '#fdba74';
                                } else if (p.type === 'backsplash') {
                                  fill = isLight ? '#0284c7' : '#0284c7';
                                  stroke = isLight ? '#0369a1' : '#7dd3fc';
                                } else if (p.type === 'waterfall') {
                                  fill = isLight ? '#9333ea' : '#9333ea';
                                  stroke = isLight ? '#7e22ce' : '#d8b4fe';
                                }

                                const fs = Math.max(22, Math.min(p.widthMm / 14, p.lengthMm / 4, 44));

                                return (
                                  <g key={pi}>
                                    <rect
                                      x={p.x}
                                      y={p.y}
                                      width={p.widthMm}
                                      height={p.lengthMm}
                                      fill={fill}
                                      fillOpacity={isLight ? 0.6 : 0.4}
                                      stroke={stroke}
                                      strokeWidth={3}
                                    />

                                    {/* Calado encastre si aplica */}
                                    {p.hasCutout && p.widthMm > 600 && p.lengthMm > 350 && (
                                      <g>
                                        <rect
                                          x={p.x + (p.widthMm - (p.hasCutout === 'sink' ? 695 : 550)) / 2}
                                          y={p.y + (p.lengthMm - (p.hasCutout === 'sink' ? 400 : 470)) / 2}
                                          width={p.hasCutout === 'sink' ? 695 : 550}
                                          height={p.hasCutout === 'sink' ? 400 : 470}
                                          fill="#ffffff"
                                          fillOpacity={isLight ? 0.3 : 0.15}
                                          stroke="#ef4444"
                                          strokeWidth={3}
                                          strokeDasharray="12,8"
                                        />
                                        <text
                                          x={p.x + p.widthMm / 2}
                                          y={p.y + p.lengthMm / 2 + 8}
                                          textAnchor="middle"
                                          fontSize={24}
                                          fontWeight="bold"
                                          fill="#dc2626"
                                        >
                                          {p.hasCutout === 'sink' ? 'ENCASTRE LAVAPLATOS' : 'ENCASTRE ENCIMERA'}
                                        </text>
                                      </g>
                                    )}

                                    {p.widthMm > 140 && p.lengthMm > 60 && (
                                      <>
                                        <text
                                          x={p.x + p.widthMm / 2}
                                          y={p.y + p.lengthMm / 2 - (p.lengthMm > 100 ? fs * 0.4 : 0)}
                                          textAnchor="middle"
                                          fontSize={fs}
                                          fontWeight="bold"
                                          fill="#ffffff"
                                        >
                                          {p.pieceId}
                                        </text>
                                        {p.lengthMm > 100 && (
                                          <text
                                            x={p.x + p.widthMm / 2}
                                            y={p.y + p.lengthMm / 2 + fs * 0.85}
                                            textAnchor="middle"
                                            fontSize={fs * 0.75}
                                            fontFamily="monospace"
                                            fill={isLight ? '#fef3c7' : '#fde68a'}
                                          >
                                            {p.widthMm} x {p.lengthMm} mm
                                          </text>
                                        )}
                                      </>
                                    )}
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                        </div>
                      ))}

                      {/* Leyenda de colores */}
                      <div className={`flex flex-wrap items-center gap-4 text-xs pt-1 ${
                        isLight ? 'text-slate-600' : 'text-slate-400'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-amber-600/80 border border-amber-400"></span>
                          <span>Cubierta Principal</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-orange-600/80 border border-orange-400"></span>
                          <span>Faldón Regrueso</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-sky-600/80 border border-sky-400"></span>
                          <span>Respaldo Zócalo</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-purple-600/80 border border-purple-400"></span>
                          <span>Pata Cascada</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm border border-red-500 border-dashed bg-red-500/20"></span>
                          <span>Calado Encastre</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Parts List Table */}
                  <div className={`rounded-xl border overflow-hidden ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/40 border-slate-700'
                  }`}>
                    <div className={`px-4 py-2.5 border-b text-xs font-semibold flex justify-between items-center ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
                    }`}>
                      <span>Despiece Técnico de Marmolería (Piedra Qstone)</span>
                      <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{nestingBOM.pieces.length} piezas</span>
                    </div>
                    <div className="overflow-x-auto max-h-60">
                      <table className={`w-full text-left text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        <thead className={`uppercase text-[10px] tracking-wider sticky top-0 ${
                          isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-900/80 text-slate-400'
                        }`}>
                          <tr>
                            <th className="py-2 px-3">Código</th>
                            <th className="py-2 px-3">Descripción</th>
                            <th className="py-2 px-3">Largo</th>
                            <th className="py-2 px-3">Ancho</th>
                            <th className="py-2 px-3">Espesor</th>
                            <th className="py-2 px-3">Área (m²)</th>
                            <th className="py-2 px-3">Pulido (m)</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                          {nestingBOM.pieces.map((p) => (
                            <tr key={p.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/50'}>
                              <td className={`py-2 px-3 font-mono text-[11px] ${isLight ? 'text-amber-700 font-bold' : 'text-amber-400'}`}>{p.id}</td>
                              <td className="py-2 px-3">{p.name}</td>
                              <td className="py-2 px-3">{p.lengthMm} mm</td>
                              <td className="py-2 px-3">{p.widthMm} mm</td>
                              <td className="py-2 px-3">{p.thicknessMm} mm</td>
                              <td className="py-2 px-3 font-medium">{p.areaM2.toFixed(3)}</td>
                              <td className="py-2 px-3">{p.edgePolishingM.toFixed(2)} m</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3.5 border-t flex items-center justify-between transition-colors ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/50'
        }`}>
          <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Producto activo:{' '}
            <span className={`font-medium ${isLight ? 'text-slate-900 font-semibold' : 'text-white'}`}>
              {selectedProduct.name} ({selectedProduct.thicknessMm}mm)
            </span>{' '}
            • ${selectedProduct.priceM2Clp.toLocaleString('es-CL')} / m²
          </div>
          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              isLight
                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
            }`}
          >
            Guardar & Aplicar al Proyecto
          </button>
        </div>
      </div>
    </div>
  );
}
