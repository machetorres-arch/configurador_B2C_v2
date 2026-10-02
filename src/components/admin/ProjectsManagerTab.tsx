import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  FileSpreadsheet,
  FileText,
  Play,
  Copy,
  Trash2,
  Edit3,
  Plus,
  Search,
  Filter,
  Check,
  X,
  LayoutDashboard,
  Box,
  Sparkles,
  Calendar,
  User,
  AlertCircle,
  RefreshCw,
  Cloud,
  HardDrive,
  Building2,
  Armchair
} from 'lucide-react';
import { useAdminStore, ProjectItem, ProjectType } from '../../store/adminStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useTenantDataStore } from '../../store/tenantDataStore';
import { exportProjectToPdf } from '../../utils/pdfGenerator';
import * as XLSX from 'xlsx-js-style';
import { useKitchenStore } from '../../store/kitchenStore';
import { useStore as useClosetStore } from '../../store';
import { useSpecialFurnitureStore } from '../../store/specialFurnitureStore';
import { useOfficeStore } from '../../store/officeStore';

interface ProjectsManagerTabProps {
  onLoadProjectToModule: (route: 'kitchen' | 'closet' | 'special' | 'hpl-bathroom' | 'office' | 'chair') => void;
}

export function ProjectsManagerTab({ onLoadProjectToModule }: ProjectsManagerTabProps) {
  const { projects, saveProject, updateProject, renameProject, duplicateProject, deleteProject, clearAllProjects, syncCloudProjects } = useAdminStore();
  const { user: supabaseUser, tenant: supabaseTenant } = useSupabaseAuthStore();
  const { saveProjectToCloud } = useTenantDataStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | ProjectType>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'designed' | 'quoted' | 'sold' | 'in_production'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editClient, setEditClient] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newType, setNewType] = useState<ProjectType>('kitchen');
  const [newName, setNewName] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Modal para registrar venta
  const [saleModalProject, setSaleModalProject] = useState<ProjectItem | null>(null);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [saleOrderNum, setSaleOrderNum] = useState<string>('');
  const [saleDate, setSaleDate] = useState<string>('');

  // Sincronizar al montar si hay supabase
  useEffect(() => {
    if (supabaseUser && supabaseTenant) {
      syncCloudProjects();
    }
  }, [supabaseUser, supabaseTenant, syncCloudProjects]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncCloudProjects();
      showNotification('Proyectos sincronizados con la nube correctamente.');
    } catch (e) {
      showNotification('Error al sincronizar proyectos.', 'info');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered projects
  const filteredProjects = projects.filter((p) => {
    const matchesType = selectedType === 'all' || p.type === selectedType;
    const currentStatus = p.status || 'designed';
    const matchesStatus = selectedStatus === 'all' || currentStatus === selectedStatus;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.orderNumber && p.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesStatus && matchesSearch;
  });

  // Métricas rápidas de pipeline
  const totalProjectsCount = projects.length;
  const soldProjects = projects.filter((p) => p.status === 'sold' || p.status === 'in_production');
  const soldVolumeClp = soldProjects.reduce((acc, p) => acc + (p.finalSalePriceClp || p.totalCostEstimateClp || 0), 0);
  const totalDesignedVolumeClp = projects.reduce((acc, p) => acc + (p.totalCostEstimateClp || 0), 0);
  const conversionRate = totalProjectsCount > 0 ? Math.round((soldProjects.length / totalProjectsCount) * 100) : 0;

  const handleOpenSaleModal = (proj: ProjectItem) => {
    setSaleModalProject(proj);
    setSalePrice(proj.finalSalePriceClp || proj.totalCostEstimateClp || 1500000);
    setSaleOrderNum(proj.orderNumber || `OT-${Math.floor(1000 + Math.random() * 9000)}`);
    setSaleDate(proj.soldDate || new Date().toISOString().split('T')[0]);
  };

  const handleConfirmSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleModalProject) return;

    updateProject(saleModalProject.id, {
      status: 'sold',
      finalSalePriceClp: Number(salePrice) || saleModalProject.totalCostEstimateClp,
      orderNumber: saleOrderNum.trim(),
      soldDate: saleDate || new Date().toISOString().split('T')[0],
    });

    showNotification(`¡Venta registrada con éxito para "${saleModalProject.name}"!`);
    setSaleModalProject(null);
  };

  const handleChangeStatus = (proj: ProjectItem, newStatus: 'designed' | 'quoted' | 'sold' | 'in_production') => {
    if (newStatus === 'sold' && proj.status !== 'sold') {
      handleOpenSaleModal(proj);
    } else {
      updateProject(proj.id, { status: newStatus });
      showNotification(`Estado de "${proj.name}" actualizado a ${getStatusLabel(newStatus)}.`);
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'quoted':
        return 'Cotizado';
      case 'sold':
        return 'Vendido';
      case 'in_production':
        return 'En Taller';
      case 'designed':
      default:
        return 'Diseñado (Borrador)';
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'sold':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            ✓ Vendido
          </span>
        );
      case 'in_production':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
            ⚙ En Taller
          </span>
        );
      case 'quoted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
            📋 Cotizado
          </span>
        );
      case 'designed':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
            ✏ Diseñado
          </span>
        );
    }
  };

  const showNotification = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleStartEdit = (proj: ProjectItem) => {
    setEditingId(proj.id);
    setEditName(proj.name);
    setEditClient(proj.client);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      renameProject(id, editName.trim(), editClient.trim());
      showNotification('Proyecto actualizado con éxito.');
    }
    setEditingId(null);
  };

  const handleDuplicate = (id: string) => {
    const newId = duplicateProject(id);
    if (newId) {
      showNotification('Proyecto duplicado.');
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Confirmas eliminar permanentemente el proyecto "${name}"?`)) {
      deleteProject(id);
      showNotification('Proyecto eliminado.', 'info');
    }
  };

  const handleOpenInConfigurator = (proj: ProjectItem) => {
    // Inject data into the target module store
    if (proj.type === 'kitchen') {
      if (proj.data?.cabinets) {
        useKitchenStore.setState({ cabinets: proj.data.cabinets });
      }
      if (proj.data?.roomConfig) {
        useKitchenStore.getState().setRoomConfig(proj.data.roomConfig);
      }
      onLoadProjectToModule('kitchen');
    } else if (proj.type === 'closet') {
      const closetState = useClosetStore.getState();
      if (proj.data) {
        if (proj.data.height) closetState.setHeight(proj.data.height);
        if (proj.data.depth) closetState.setDepth(proj.data.depth);
        if (proj.data.thickness) closetState.setThickness(proj.data.thickness);
        if (proj.data.structureColor) closetState.setStructureColor(proj.data.structureColor);
        if (proj.data.doorColor) closetState.setDoorColor(proj.data.doorColor);
        if (proj.data.modules) {
          useClosetStore.setState({ modules: proj.data.modules });
        }
      }
      onLoadProjectToModule('closet');
    } else if (proj.type === 'special') {
      const specialState = useSpecialFurnitureStore.getState();
      if (proj.data) {
        if (proj.data.width) specialState.setWidth(proj.data.width);
        if (proj.data.height) specialState.setHeight(proj.data.height);
        if (proj.data.depth) specialState.setDepth(proj.data.depth);
        if (proj.data.abetTextureId) specialState.setBackTexture(proj.data.abetTextureId);
        if (proj.data.woodColor) specialState.setExteriorColor('terracota');
      }
      onLoadProjectToModule('special');
    } else if (proj.type === 'office') {
      const officeState = useOfficeStore.getState();
      if (proj.data) {
        if (proj.data.placedItems) {
          useOfficeStore.setState({ placedItems: proj.data.placedItems });
        }
        if (proj.data.floorPlan) {
          useOfficeStore.setState({ floorPlan: proj.data.floorPlan });
        }
      }
      onLoadProjectToModule('office');
    } else if (proj.type === 'hpl-bathroom') {
      onLoadProjectToModule('hpl-bathroom');
    } else if (proj.type === 'chair') {
      onLoadProjectToModule('chair');
    }
  };

  const handleDownloadPdf = (proj: ProjectItem) => {
    try {
      exportProjectToPdf(proj);
      showNotification(`PDF generado para "${proj.name}".`);
    } catch (e) {
      console.error('Error generating PDF', e);
      alert('Error al generar el PDF del proyecto.');
    }
  };

  const handleDownloadExcel = (proj: ProjectItem) => {
    try {
      generateProjectExcel(proj);
      showNotification(`Excel generado para "${proj.name}".`);
    } catch (e) {
      console.error('Error generating Excel', e);
      alert('Error al generar la planilla Excel.');
    }
  };

  const handleCreateNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    let initialData: any = {};
    let estimatedCost = 1500000;

    if (newType === 'kitchen') {
      const current = useKitchenStore.getState();
      initialData = {
        cabinets: current.cabinets,
        thickness: 18,
      };
      estimatedCost = 4500000;
    } else if (newType === 'closet') {
      const current = useClosetStore.getState();
      initialData = {
        height: current.height,
        depth: current.depth,
        thickness: current.thickness,
        structureColor: current.structureColor,
        doorColor: current.doorColor,
        modules: current.modules,
      };
      estimatedCost = 1800000;
    } else if (newType === 'special') {
      const current = useSpecialFurnitureStore.getState();
      initialData = {
        width: current.width,
        height: current.height,
        depth: current.depth,
        thickness: current.thickness,
        abetTextureId: current.backTexture,
      };
      estimatedCost = 1350000;
    } else if (newType === 'office') {
      const current = useOfficeStore.getState();
      initialData = {
        placedItems: current.placedItems,
      };
      estimatedCost = 3200000;
    }

    saveProject({
      name: newName.trim(),
      client: newClient.trim() || 'General',
      type: newType,
      description: newDescription.trim() || 'Proyecto guardado desde Backoffice',
      totalCostEstimateClp: estimatedCost,
      data: initialData,
    });

    if (supabaseUser && supabaseTenant) {
      const cloudTypeMap: Record<ProjectType, 'kitchen' | 'closet' | 'special_furniture'> = {
        kitchen: 'kitchen',
        closet: 'closet',
        special: 'special_furniture',
        'hpl-bathroom': 'special_furniture',
        office: 'special_furniture',
        chair: 'special_furniture',
      };
      saveProjectToCloud({
        code: `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
        name: newName.trim(),
        client_name: newClient.trim() || 'General',
        project_type: cloudTypeMap[newType],
        status: 'draft',
        total_area_m2: 0,
        total_sheets_count: 0,
        material_cost: estimatedCost * 0.6,
        hardware_cost: estimatedCost * 0.15,
        total_price: estimatedCost,
        config_json: initialData,
      }).catch(console.warn);
    }

    setIsCreatingNew(false);
    setNewName('');
    setNewClient('');
    setNewDescription('');
    showNotification('Nuevo proyecto guardado exitosamente.');
  };

  const getModuleBadge = (type: ProjectType) => {
    switch (type) {
      case 'kitchen':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded text-[10px] font-bold uppercase tracking-wider">
            <LayoutDashboard size={12} /> Cocina
          </span>
        );
      case 'closet':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded text-[10px] font-bold uppercase tracking-wider">
            <Box size={12} /> Clóset
          </span>
        );
      case 'special':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold uppercase tracking-wider">
            <Sparkles size={12} /> Especial
          </span>
        );
      case 'hpl-bathroom':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded text-[10px] font-bold uppercase tracking-wider">
            <FolderKanban size={12} /> Baños HPL
          </span>
        );
      case 'office':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded text-[10px] font-bold uppercase tracking-wider">
            <Building2 size={12} /> Oficinas
          </span>
        );
      case 'chair':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded text-[10px] font-bold uppercase tracking-wider">
            <Armchair size={12} /> Sillas
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <Check size={16} />
          {feedbackMsg.text}
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
          <div className="text-[10px] uppercase font-bold text-zinc-400">Total en Cartera</div>
          <div className="text-xl font-extrabold text-white mt-0.5">{totalProjectsCount}</div>
          <div className="text-[10px] text-zinc-500 font-mono">${(totalDesignedVolumeClp / 1000000).toFixed(2)}M CLP est.</div>
        </div>

        <div className="bg-zinc-900/80 border border-emerald-500/30 rounded-xl p-3">
          <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-between">
            <span>Ventas Cerradas</span>
            <span className="text-[9px] bg-emerald-500/20 px-1.5 py-0.2 rounded font-mono font-bold">{conversionRate}% conv.</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{soldProjects.length}</div>
          <div className="text-[10px] text-emerald-300/80 font-mono">${(soldVolumeClp / 1000000).toFixed(2)}M CLP real</div>
        </div>

        <div className="bg-zinc-900/80 border border-blue-500/20 rounded-xl p-3">
          <div className="text-[10px] uppercase font-bold text-blue-400">En Diseño / Borrador</div>
          <div className="text-xl font-extrabold text-blue-400 mt-0.5">
            {projects.filter((p) => !p.status || p.status === 'designed').length}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">Demanda potencial</div>
        </div>

        <div className="bg-zinc-900/80 border border-amber-500/20 rounded-xl p-3">
          <div className="text-[10px] uppercase font-bold text-amber-400">Cotizados / En Taller</div>
          <div className="text-xl font-extrabold text-amber-400 mt-0.5">
            {projects.filter((p) => p.status === 'quoted' || p.status === 'in_production').length}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">En negociación / taller</div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="space-y-3 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por proyecto, cliente, N° OT o descripción..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Type Tabs */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 overflow-x-auto">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'kitchen', label: 'Cocinas' },
              { id: 'closet', label: 'Clósets' },
              { id: 'office', label: 'Oficinas' },
              { id: 'special', label: 'Muebles Esp.' },
              { id: 'hpl-bathroom', label: 'Baños HPL' },
              { id: 'chair', label: 'Sillas' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id as any)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
                  selectedType === tab.id
                    ? 'bg-orange-500 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-zinc-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Actions Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {projects.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('¿Confirmas eliminar TODOS los proyectos guardados y reiniciar desde cero?')) {
                    clearAllProjects();
                    showNotification('Todos los proyectos han sido eliminados.');
                  }
                }}
                className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Eliminar todos los proyectos y partir desde cero"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">Vaciar Todo</span>
              </button>
            )}

            {supabaseUser && supabaseTenant && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-3 py-2 bg-zinc-950 border border-sky-500/30 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Sincronizar proyectos con base de datos en la nube"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar Nube'}</span>
              </button>
            )}

            {/* Create Button */}
            <button
              onClick={() => setIsCreatingNew(!isCreatingNew)}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Plus size={16} /> Guardar Nuevo
            </button>
          </div>
        </div>

        {/* Pipeline Status Filter Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80 overflow-x-auto text-xs">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Filter size={12} /> Pipeline:
          </span>
          {[
            { id: 'all', label: 'Todos los estados' },
            { id: 'designed', label: '✏ Diseñados' },
            { id: 'quoted', label: '📋 Cotizados' },
            { id: 'sold', label: '✓ Vendidos' },
            { id: 'in_production', label: '⚙ En Taller' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatus(st.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedStatus === st.id
                  ? 'bg-zinc-100 text-zinc-950 font-bold shadow'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* New Project Form */}
      {isCreatingNew && (
        <form
          onSubmit={handleCreateNewProject}
          className="p-5 bg-zinc-900/90 border border-orange-500/40 rounded-xl space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FolderKanban size={18} className="text-orange-500" />
              Guardar Nuevo Proyecto en Base de Datos
            </h3>
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className="text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Módulo / Tipo</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as ProjectType)}
                className="w-full p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="kitchen">Cocina Planificador 2D/3D</option>
                <option value="closet">Clóset Paramétrico Modular</option>
                <option value="office">Mobiliario de Oficina (Space Planning 3D)</option>
                <option value="special">Mueble Especial Abet & Madera</option>
                <option value="hpl-bathroom">Cabinas Sanitarias HPL</option>
                <option value="chair">Diseño y Fabricación de Sillas</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nombre del Proyecto</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej. Casa Molco Lago Ranco"
                className="w-full p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Cliente / Referencia</label>
              <input
                type="text"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                placeholder="Ej. Inmobiliaria Sur / Particular"
                className="w-full p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Descripción Técnica</label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Especificaciones, ubicación o notas de cubicación..."
              className="w-full p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-300 text-xs font-semibold rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow"
            >
              Guardar Proyecto
            </button>
          </div>
        </form>
      )}

      {/* Projects List */}
      <div className="space-y-3">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl">
            <FolderKanban size={40} className="mx-auto text-zinc-600 mb-3" />
            <p className="text-sm font-semibold text-slate-400">No se encontraron proyectos guardados.</p>
            <p className="text-xs text-zinc-600 mt-1">Guarda un nuevo proyecto o ajusta el filtro de búsqueda.</p>
          </div>
        ) : (
          filteredProjects.map((proj) => (
            <div
              key={proj.id}
              className="group bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-all hover:bg-zinc-900 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm"
            >
              {/* Left Info */}
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  {getModuleBadge(proj.type)}
                  {getStatusBadge(proj.status)}

                  {editingId === proj.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="p-1 px-2 bg-zinc-950 border border-orange-500 rounded text-xs text-white font-bold"
                      />
                      <input
                        type="text"
                        value={editClient}
                        onChange={(e) => setEditClient(e.target.value)}
                        placeholder="Cliente"
                        className="p-1 px-2 bg-zinc-950 border border-zinc-700 rounded text-xs text-slate-300"
                      />
                      <button
                        onClick={() => handleSaveEdit(proj.id)}
                        className="p-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded"
                        title="Guardar"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 bg-zinc-800 text-slate-400 hover:bg-zinc-700 rounded"
                        title="Cancelar"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <h4 className="text-sm font-bold text-white tracking-tight truncate flex items-center gap-2">
                      {proj.name}
                      <button
                        onClick={() => handleStartEdit(proj)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-orange-400 transition-opacity"
                        title="Editar nombre y cliente"
                      >
                        <Edit3 size={12} />
                      </button>
                    </h4>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-slate-300">
                    <User size={12} className="text-zinc-500" />
                    Cliente: <strong className="text-slate-200">{proj.client || 'General'}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-zinc-500" />
                    {proj.date}
                  </span>
                  <span className="text-orange-400/90 font-mono font-semibold">
                    Est. ${proj.totalCostEstimateClp?.toLocaleString('es-CL') || '0'} CLP
                  </span>

                  {/* Detalle si fue vendido */}
                  {proj.status === 'sold' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono font-bold">
                      Venta: ${(proj.finalSalePriceClp || proj.totalCostEstimateClp || 0).toLocaleString('es-CL')} CLP
                      {proj.orderNumber && ` • OT: ${proj.orderNumber}`}
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-500 truncate max-w-2xl">{proj.description}</p>
              </div>

              {/* Action Buttons & Status Selector */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Pipeline Status Selector */}
                <select
                  value={proj.status || 'designed'}
                  onChange={(e) => handleChangeStatus(proj, e.target.value as any)}
                  className="py-1.5 px-2 bg-zinc-950 border border-zinc-700 text-xs rounded-lg text-slate-300 font-medium focus:border-orange-500 focus:outline-none cursor-pointer"
                  title="Cambiar estado del proyecto en el pipeline"
                >
                  <option value="designed">✏ Diseñado</option>
                  <option value="quoted">📋 Cotizado</option>
                  <option value="sold">✓ Vendido</option>
                  <option value="in_production">⚙ En Taller</option>
                </select>

                {/* Quick Register Sale Button if not sold */}
                {proj.status !== 'sold' && proj.status !== 'in_production' && (
                  <button
                    onClick={() => handleOpenSaleModal(proj)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm shadow-emerald-600/30"
                    title="Registrar cierre de venta con precio y N° OT"
                  >
                    <Check size={13} />
                    <span>Registrar Venta</span>
                  </button>
                )}

                {/* Open in Configurator */}
                <button
                  onClick={() => handleOpenInConfigurator(proj)}
                  className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Abrir y editar en el configurador 3D"
                >
                  <Play size={13} /> Cargar en 3D
                </button>

                {/* Direct PDF Download */}
                <button
                  onClick={() => handleDownloadPdf(proj)}
                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Descargar Ficha Técnica en PDF"
                >
                  <FileText size={14} className="text-orange-400" /> PDF
                </button>

                {/* Direct Excel Download */}
                <button
                  onClick={() => handleDownloadExcel(proj)}
                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Descargar Planilla de Materiales en Excel"
                >
                  <FileSpreadsheet size={14} className="text-emerald-400" /> Excel
                </button>

                {/* Duplicate */}
                <button
                  onClick={() => handleDuplicate(proj.id)}
                  className="p-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                  title="Duplicar proyecto"
                >
                  <Copy size={14} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(proj.id, proj.name)}
                  className="p-1.5 bg-zinc-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                  title="Eliminar proyecto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Registrar Venta */}
      {saleModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Check size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Registrar Cierre de Venta</h3>
                  <p className="text-[11px] text-zinc-400">Proyecto: {saleModalProject.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSaleModalProject(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmSale} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Monto Real de Venta (CLP) <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  placeholder="1500000"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Presupuesto base diseñado: ${saleModalProject.totalCostEstimateClp?.toLocaleString('es-CL')} CLP
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    N° Orden / Factura / OT
                  </label>
                  <input
                    type="text"
                    value={saleOrderNum}
                    onChange={(e) => setSaleOrderNum(e.target.value)}
                    placeholder="OT-4029"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Fecha de Cierre
                  </label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSaleModalProject(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
                >
                  <Check size={14} /> Confirmar Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function generateProjectExcel(project: ProjectItem) {
  const wb = XLSX.utils.book_new();

  // Generar planilla de materiales para Mobiliario (Cocina, Clóset, Especial, Oficina, etc.)
  const rows = [
    ['MUEBLESTUDIO 3D - PLANILLA DE FABRICACIÓN'],
    ['Proyecto:', project.name],
    ['Cliente:', project.client],
    ['Tipo:', project.type.toUpperCase()],
    ['Fecha:', project.date],
    ['Presupuesto Estimado CLP:', project.totalCostEstimateClp],
    [''],
    ['PARÁMETROS TÉCNICOS CONFIGURADOS'],
    ...Object.entries(project.data || {}).map(([k, v]) => [
      k,
      typeof v === 'object' ? JSON.stringify(v) : String(v),
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Datos Fabricación');

  const filename = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_materiales.xlsx`;
  XLSX.writeFile(wb, filename);
}
