import React, { useState } from 'react';
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
  Home,
  LayoutDashboard,
  Box,
  Sparkles,
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';
import { useAdminStore, ProjectItem, ProjectType } from '../../store/adminStore';
import { exportProjectToPdf } from '../../utils/pdfGenerator';
import * as XLSX from 'xlsx-js-style';
import { calculateSipHouseQuantities } from '../../utils/sipExcelGenerator';
import { useSipHouseStore } from '../../store/sipHouseStore';
import { useKitchenStore } from '../../store/kitchenStore';
import { useStore as useClosetStore } from '../../store';
import { useSpecialFurnitureStore } from '../../store/specialFurnitureStore';

interface ProjectsManagerTabProps {
  onLoadProjectToModule: (route: 'sip-house' | 'kitchen' | 'closet' | 'special') => void;
}

export function ProjectsManagerTab({ onLoadProjectToModule }: ProjectsManagerTabProps) {
  const { projects, saveProject, renameProject, duplicateProject, deleteProject } = useAdminStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | ProjectType>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editClient, setEditClient] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newType, setNewType] = useState<ProjectType>('sip-house');
  const [newName, setNewName] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Filtered projects
  const filteredProjects = projects.filter((p) => {
    const matchesType = selectedType === 'all' || p.type === selectedType;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

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
    if (proj.type === 'sip-house') {
      const sipState = useSipHouseStore.getState();
      if (proj.data) {
        if (proj.data.dimensions) {
          Object.entries(proj.data.dimensions).forEach(([k, v]) => {
            sipState.setDimension(k as any, Number(v));
          });
        }
        if (proj.data.foundationType) sipState.setFoundationType(proj.data.foundationType);
        if (proj.data.extCladding) sipState.setExteriorCladding(proj.data.extCladding);
        if (proj.data.roofCladding) sipState.setRoofCladding(proj.data.roofCladding);
        if (proj.data.interiorCeiling) sipState.setInteriorCeiling(proj.data.interiorCeiling);
        if (proj.data.flooringType) sipState.setFlooringType(proj.data.flooringType);
        if (proj.data.coreType) sipState.setCoreType(proj.data.coreType);
        if (proj.data.wallThicknessMm) sipState.setWallThicknessMm(proj.data.wallThicknessMm);
        if (proj.data.roofThicknessMm) sipState.setRoofThicknessMm(proj.data.roofThicknessMm);
        if (proj.data.floorThicknessMm) sipState.setFloorThicknessMm(proj.data.floorThicknessMm);
      }
      onLoadProjectToModule('sip-house');
    } else if (proj.type === 'kitchen') {
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

    if (newType === 'sip-house') {
      const current = useSipHouseStore.getState();
      initialData = {
        dimensions: current.dimensions,
        foundationType: current.foundationType,
        extCladding: current.exteriorCladding,
        roofCladding: current.roofCladding,
        interiorCeiling: current.interiorCeiling,
        flooringType: current.flooringType,
        coreType: current.coreType,
        wallThicknessMm: current.wallThicknessMm,
        roofThicknessMm: current.roofThicknessMm,
        floorThicknessMm: current.floorThicknessMm,
      };
      estimatedCost = 28000000;
    } else if (newType === 'kitchen') {
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
    }

    saveProject({
      name: newName.trim(),
      client: newClient.trim() || 'General',
      type: newType,
      description: newDescription.trim() || 'Proyecto guardado desde Backoffice',
      totalCostEstimateClp: estimatedCost,
      data: initialData,
    });

    setIsCreatingNew(false);
    setNewName('');
    setNewClient('');
    setNewDescription('');
    showNotification('Nuevo proyecto guardado exitosamente.');
  };

  const getModuleBadge = (type: ProjectType) => {
    switch (type) {
      case 'sip-house':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded text-[10px] font-bold uppercase tracking-wider">
            <Home size={12} /> Casa SIP
          </span>
        );
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

      {/* Action & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por proyecto, cliente o descripción..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Type Tabs */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 overflow-x-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'sip-house', label: 'Casas SIP' },
            { id: 'kitchen', label: 'Cocinas' },
            { id: 'closet', label: 'Clósets' },
            { id: 'special', label: 'Muebles Esp.' },
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

        {/* Create Button */}
        <button
          onClick={() => setIsCreatingNew(!isCreatingNew)}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 shrink-0 transition-all"
        >
          <Plus size={16} /> Guardar Nuevo
        </button>
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
                <option value="sip-house">Casa Panel SIP (Molco 132 m²)</option>
                <option value="kitchen">Cocina Planificador 2D/3D</option>
                <option value="closet">Clóset Paramétrico Modular</option>
                <option value="special">Mueble Especial Abet & Madera</option>
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
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  {getModuleBadge(proj.type)}

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

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
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
                </div>

                <p className="text-xs text-zinc-500 truncate max-w-2xl">{proj.description}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
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
    </div>
  );
}

function generateProjectExcel(project: ProjectItem) {
  const wb = XLSX.utils.book_new();

  if (project.type === 'sip-house') {
    const d = project.data || {};
    const dim = d.dimensions || { width: 800, length: 1200, wallHeight: 280, roofPitch: 22 };
    const quantities = calculateSipHouseQuantities(
      dim,
      d.foundationType || 'radier_sobrecimiento',
      d.extCladding || 'zincalum_negro',
      d.roofCladding || 'zinc_ca8_negro',
      d.interiorCeiling || 'entablado_pino',
      d.flooringType || 'vinilico_spc',
      d.openings || [],
      d.mepNetwork,
      d.coreType || 'eps_15kg',
      d.wallThicknessMm || 114,
      d.roofThicknessMm || 210,
      d.floorThicknessMm || 114,
      d.interiorWalls || []
    );

    const rows = [
      ['PROYECTO SIP INDUSTRIALIZADO - ROBFU / MUEBLESTUDIO'],
      ['Nombre Proyecto:', project.name],
      ['Cliente:', project.client || 'General'],
      ['Fecha:', project.date],
      [''],
      ['RESUMEN GENERAL DE SUPERFICIES Y COSTOS'],
      ['Superficie Piso Útil (m²):', quantities.totalFloorM2],
      ['Superficie Muros SIP (m²):', quantities.extWallAreaM2],
      ['Superficie Techo SIP (m²):', quantities.totalRoofAreaM2],
      ['Total General Estimado CLP:', quantities.totalPresupuestoClp],
      [''],
      ['CUBICACIÓN Y LISTA DE MATERIALES (BOM)'],
      ['Especialidad', 'Código', 'Ítem', 'Descripción', 'Unidad', 'Cantidad', 'Precio Unitario CLP', 'Total CLP', 'Proveedor'],
      ...quantities.items.map((i) => [
        i.especialidad,
        i.codigo,
        i.item,
        i.descripcion,
        i.unidad,
        i.cantidad,
        i.precioUnitarioClp,
        i.totalClp,
        i.proveedor,
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Cubicación SIP');
  } else {
    // Generar planilla de materiales para Cocina, Clóset o Especial
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
  }

  const filename = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_materiales.xlsx`;
  XLSX.writeFile(wb, filename);
}
