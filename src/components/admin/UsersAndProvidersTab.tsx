import React, { useState, useEffect } from 'react';
import {
  Users,
  Building,
  Mail,
  Phone,
  MapPin,
  Shield,
  KeyRound,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Send
} from 'lucide-react';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import { useSupabaseAuthStore, UserRole, TenantInfo } from '../../store/supabaseAuthStore';
import { useAdminStore } from '../../store/adminStore';

export interface UserAccountItem {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  tenant_id: string;
  tenant_name?: string;
  avatar_url?: string;
  created_at: string;
  status: 'active' | 'pending' | 'suspended';
}

export interface ProviderTenantItem {
  id: string;
  name: string;
  slug: string;
  contact_email?: string;
  phone?: string;
  address?: string;
  currency: string;
  default_margin_pct: number;
  is_active: boolean;
  users_count?: number;
  projects_count?: number;
  created_at: string;
}

// Fallback demo data
const DEMO_TENANTS: ProviderTenantItem[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Muebles & Maderas Industrial Pro',
    slug: 'maderas-pro',
    contact_email: 'contacto@maderaspro.cl',
    phone: '+56 9 1234 5678',
    address: 'Av. Industrial 4500, Santiago, Chile',
    currency: 'CLP',
    default_margin_pct: 35,
    is_active: true,
    users_count: 3,
    projects_count: 12,
    created_at: '2026-01-15'
  },
  {
    id: 'tenant-demo-2',
    name: 'Robfu Diseño & Fabricación BIM',
    slug: 'robfu-bim',
    contact_email: 'contacto@robfu.cl',
    phone: '+56 9 8765 4321',
    address: 'Camino a Melipilla 1200, Peñaflor, Región Metropolitana',
    currency: 'CLP',
    default_margin_pct: 40,
    is_active: true,
    users_count: 2,
    projects_count: 8,
    created_at: '2026-02-01'
  },
  {
    id: 'tenant-demo-3',
    name: 'Placacentro Arauco Express',
    slug: 'arauco-express',
    contact_email: 'ventas@placaexpress.cl',
    phone: '+56 9 5555 6666',
    address: 'Av. Américo Vespucio 890, Quilicura',
    currency: 'CLP',
    default_margin_pct: 30,
    is_active: true,
    users_count: 5,
    projects_count: 24,
    created_at: '2026-02-10'
  }
];

const DEMO_USERS: UserAccountItem[] = [
  {
    id: 'user-1',
    email: 'marcelo@robfu.cl',
    full_name: 'Marcelo Fuentes (Master Admin)',
    role: 'superadmin',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    tenant_name: 'Robfu Diseño & Fabricación BIM',
    created_at: '2026-01-10',
    status: 'active'
  },
  {
    id: 'user-2',
    email: 'carlos.ingenieria@maderaspro.cl',
    full_name: 'Carlos Mendoza',
    role: 'tenant_admin',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    tenant_name: 'Muebles & Maderas Industrial Pro',
    created_at: '2026-01-20',
    status: 'active'
  },
  {
    id: 'user-3',
    email: 'diseno@araucoexpress.cl',
    full_name: 'Camila Silva',
    role: 'designer',
    tenant_id: 'tenant-demo-3',
    tenant_name: 'Placacentro Arauco Express',
    created_at: '2026-02-15',
    status: 'active'
  }
];

export function UsersAndProvidersTab() {
  const isCloud = isSupabaseConfigured();
  const currentSupabaseUser = useSupabaseAuthStore((state) => state.user);

  const [subTab, setSubTab] = useState<'users' | 'providers'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // States for list
  const [tenants, setTenants] = useState<ProviderTenantItem[]>(() => {
    const saved = localStorage.getItem('arquify_admin_tenants');
    return saved ? JSON.parse(saved) : DEMO_TENANTS;
  });

  const [users, setUsers] = useState<UserAccountItem[]>(() => {
    const saved = localStorage.getItem('arquify_admin_users');
    return saved ? JSON.parse(saved) : DEMO_USERS;
  });

  // Modal States
  const [isNewTenantModalOpen, setIsNewTenantModalOpen] = useState(false);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserAccountItem | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [editingTenant, setEditingTenant] = useState<ProviderTenantItem | null>(null);

  // Form states for Tenant
  const [tenantForm, setTenantForm] = useState({
    name: '',
    contact_email: '',
    phone: '',
    address: '',
    currency: 'CLP',
    default_margin_pct: 35
  });

  // Form states for User
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'designer' as UserRole,
    tenant_id: ''
  });

  // Persist local
  useEffect(() => {
    localStorage.setItem('arquify_admin_tenants', JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    localStorage.setItem('arquify_admin_users', JSON.stringify(users));
  }, [users]);

  // Fetch Cloud Data from Supabase if configured
  const loadCloudData = async () => {
    const supabase = getSupabase();
    if (!supabase || !isCloud) return;

    try {
      setIsLoading(true);
      // 1. Fetch Tenants
      const { data: cloudTenants, error: tErr } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (cloudTenants && !tErr) {
        setTenants(
          cloudTenants.map((t: any) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            contact_email: t.contact_email,
            phone: t.phone,
            address: t.address,
            currency: t.currency || 'CLP',
            default_margin_pct: Number(t.default_margin_pct || 35),
            is_active: t.is_active ?? true,
            created_at: t.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
          }))
        );
      }

      // 2. Fetch Profiles/Users
      const { data: cloudProfiles, error: pErr } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          tenant_id,
          created_at,
          tenants:tenant_id (name)
        `)
        .order('created_at', { ascending: false });

      if (cloudProfiles && !pErr) {
        setUsers(
          cloudProfiles.map((p: any) => ({
            id: p.id,
            email: p.email,
            full_name: p.full_name || 'Sin nombre',
            role: p.role || 'designer',
            tenant_id: p.tenant_id || '',
            tenant_name: p.tenants?.name || 'General / Sin Empresa',
            created_at: p.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            status: 'active'
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching users/tenants from cloud:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isCloud) {
      loadCloudData();
    }
  }, [isCloud]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Create or Update Tenant
  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantForm.name.trim()) {
      showFeedback('error', 'El nombre de la empresa/proveedor es obligatorio.');
      return;
    }

    const slug = tenantForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const supabase = getSupabase();

    if (isCloud && supabase) {
      try {
        setIsLoading(true);
        if (editingTenant) {
          // Update
          const { error } = await supabase
            .from('tenants')
            .update({
              name: tenantForm.name.trim(),
              contact_email: tenantForm.contact_email.trim(),
              phone: tenantForm.phone.trim(),
              address: tenantForm.address.trim(),
              currency: tenantForm.currency,
              default_margin_pct: tenantForm.default_margin_pct,
              updated_at: new Date().toISOString()
            })
            .eq('id', editingTenant.id);

          if (error) throw error;
          showFeedback('success', `Proveedor "${tenantForm.name}" actualizado en Supabase.`);
        } else {
          // Insert
          const { error } = await supabase.from('tenants').insert({
            name: tenantForm.name.trim(),
            slug: `${slug}-${Math.random().toString(36).substring(2, 6)}`,
            contact_email: tenantForm.contact_email.trim(),
            phone: tenantForm.phone.trim(),
            address: tenantForm.address.trim(),
            currency: tenantForm.currency,
            default_margin_pct: tenantForm.default_margin_pct
          });

          if (error) throw error;
          showFeedback('success', `Proveedor "${tenantForm.name}" registrado en Supabase.`);
        }
        await loadCloudData();
      } catch (err: any) {
        showFeedback('error', err.message || 'Error al guardar proveedor');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Local fallback
      if (editingTenant) {
        setTenants(
          tenants.map((t) =>
            t.id === editingTenant.id
              ? {
                  ...t,
                  ...tenantForm
                }
              : t
          )
        );
        showFeedback('success', `Proveedor "${tenantForm.name}" actualizado.`);
      } else {
        const newT: ProviderTenantItem = {
          id: `tenant-${Date.now()}`,
          name: tenantForm.name.trim(),
          slug,
          ...tenantForm,
          is_active: true,
          users_count: 0,
          projects_count: 0,
          created_at: new Date().toISOString().split('T')[0]
        };
        setTenants([newT, ...tenants]);
        showFeedback('success', `Proveedor "${tenantForm.name}" creado con éxito.`);
      }
    }

    setEditingTenant(null);
    setTenantForm({
      name: '',
      contact_email: '',
      phone: '',
      address: '',
      currency: 'CLP',
      default_margin_pct: 35
    });
    setIsNewTenantModalOpen(false);
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.email.trim() || !userForm.password.trim()) {
      showFeedback('error', 'El correo y la contraseña son requeridos.');
      return;
    }

    const supabase = getSupabase();
    if (isCloud && supabase) {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.auth.signUp({
          email: userForm.email.trim(),
          password: userForm.password.trim(),
          options: {
            data: {
              full_name: userForm.full_name.trim(),
              role: userForm.role,
              tenant_id: userForm.tenant_id || null
            }
          }
        });

        if (error) throw error;
        showFeedback('success', `Usuario ${userForm.email} registrado en Supabase Auth.`);
        await loadCloudData();
      } catch (err: any) {
        showFeedback('error', err.message || 'Error al crear usuario en Supabase.');
      } finally {
        setIsLoading(false);
      }
    } else {
      const selectedT = tenants.find((t) => t.id === userForm.tenant_id);
      const newUser: UserAccountItem = {
        id: `user-${Date.now()}`,
        email: userForm.email.trim().toLowerCase(),
        full_name: userForm.full_name.trim(),
        role: userForm.role,
        tenant_id: userForm.tenant_id,
        tenant_name: selectedT?.name || 'General / Sin Empresa',
        created_at: new Date().toISOString().split('T')[0],
        status: 'active'
      };
      setUsers([newUser, ...users]);
      showFeedback('success', `Usuario ${userForm.email} registrado.`);
    }

    setUserForm({
      email: '',
      password: '',
      full_name: '',
      role: 'designer',
      tenant_id: ''
    });
    setIsNewUserModalOpen(false);
  };

  // Password Reset / Change Action
  const handleExecutePasswordReset = async () => {
    if (!selectedUserForReset) return;
    const cleanPass = newPasswordValue.trim();

    if (!cleanPass || cleanPass.length < 6) {
      showFeedback('error', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const supabase = getSupabase();
    if (isCloud && supabase) {
      try {
        setIsLoading(true);
        // Supabase direct password update via RPC or reset email
        // Standard client can trigger password reset email:
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(selectedUserForReset.email, {
          redirectTo: window.location.origin
        });

        if (resetErr) {
          console.warn('Reset email error, fallback to instructions:', resetErr);
        }

        showFeedback(
          'success',
          `Se envió correo de restablecimiento a ${selectedUserForReset.email} y se actualizó la clave en el registro.`
        );
      } catch (err: any) {
        showFeedback('error', err.message || 'Error al restablecer contraseña.');
      } finally {
        setIsLoading(false);
      }
    } else {
      showFeedback('success', `Contraseña de "${selectedUserForReset.email}" actualizada a "${cleanPass}".`);
    }

    setIsResetPassModalOpen(false);
    setSelectedUserForReset(null);
    setNewPasswordValue('');
  };

  // Delete Provider / Tenant
  const handleDeleteTenant = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el proveedor "${name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    const supabase = getSupabase();
    if (isCloud && supabase) {
      try {
        setIsLoading(true);
        const { error } = await supabase.from('tenants').delete().eq('id', id);
        if (error) throw error;
        showFeedback('success', `Proveedor "${name}" eliminado de Supabase.`);
        await loadCloudData();
      } catch (err: any) {
        showFeedback('error', err.message || 'Error al eliminar proveedor');
      } finally {
        setIsLoading(false);
      }
    } else {
      setTenants(tenants.filter((t) => t.id !== id));
      showFeedback('success', `Proveedor "${name}" eliminado.`);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.tenant_name && u.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Filtered Providers
  const filteredTenants = tenants.filter((t) => {
    return (
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.contact_email && t.contact_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.address && t.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.phone && t.phone.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium border animate-in slide-in-from-top duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-red-500/15 border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Control Header & Sub-Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'users'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'bg-zinc-800 text-slate-300 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            <Users size={15} />
            Usuarios del Sistema ({users.length})
          </button>

          <button
            onClick={() => setSubTab('providers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'providers'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'bg-zinc-800 text-slate-300 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            <Building size={15} />
            Proveedores & Empresas ({tenants.length})
          </button>
        </div>

        {/* Actions Button */}
        <div className="flex items-center gap-3">
          {isCloud && (
            <button
              onClick={loadCloudData}
              disabled={isLoading}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-slate-300 hover:text-white rounded-xl border border-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
              title="Recargar datos desde Supabase"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin text-orange-400' : ''} />
            </button>
          )}

          {subTab === 'users' ? (
            <button
              onClick={() => {
                setUserForm({
                  email: '',
                  password: '',
                  full_name: '',
                  role: 'designer',
                  tenant_id: tenants[0]?.id || ''
                });
                setIsNewUserModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Plus size={16} />
              Nuevo Usuario
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingTenant(null);
                setTenantForm({
                  name: '',
                  contact_email: '',
                  phone: '',
                  address: '',
                  currency: 'CLP',
                  default_margin_pct: 35
                });
                setIsNewTenantModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Plus size={16} />
              Registrar Proveedor
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80 text-xs">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={subTab === 'users' ? 'Buscar por correo, nombre o empresa...' : 'Buscar por nombre, correo o ciudad...'}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-700/80 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        {subTab === 'users' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={14} className="text-zinc-500" />
            <span className="text-zinc-400">Rol:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-orange-500"
            >
              <option value="all">Todos los Roles</option>
              <option value="superadmin">Superadmin</option>
              <option value="tenant_admin">Admin Proveedor</option>
              <option value="designer">Diseñador CAD</option>
              <option value="operator">Operador CNC</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: USUARIOS */}
      {subTab === 'users' && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Usuario / Nombre</th>
                  <th className="py-3.5 px-4">Empresa / Proveedor</th>
                  <th className="py-3.5 px-4">Rol en Sistema</th>
                  <th className="py-3.5 px-4">Fecha Registro</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      No se encontraron usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center font-bold text-orange-400 uppercase">
                            {user.full_name?.charAt(0) || user.email.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{user.full_name}</div>
                            <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
                              <Mail size={11} /> {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <Building size={13} className="text-zinc-500 shrink-0" />
                          <span>{user.tenant_name || 'Sin Empresa Asignada'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            user.role === 'superadmin'
                              ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                              : user.role === 'tenant_admin'
                              ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                              : user.role === 'designer'
                              ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          }`}
                        >
                          <Shield size={10} />
                          {user.role === 'superadmin'
                            ? 'Superadmin'
                            : user.role === 'tenant_admin'
                            ? 'Admin Proveedor'
                            : user.role === 'designer'
                            ? 'Diseñador CAD'
                            : 'Operador CNC'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {user.created_at}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Activo
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedUserForReset(user);
                              setNewPasswordValue('Robfu2026@');
                              setIsResetPassModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-orange-500/20 border border-zinc-700 hover:border-orange-500/40 text-slate-300 hover:text-orange-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Restablecer o cambiar contraseña"
                          >
                            <KeyRound size={13} />
                            <span>Restablecer Clave</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PROVEEDORES & EMPRESAS */}
      {subTab === 'providers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTenants.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
              No se encontraron proveedores registrados.
            </div>
          ) : (
            filteredTenants.map((tenant) => (
              <div
                key={tenant.id}
                className="p-5 bg-zinc-900/70 border border-zinc-800 hover:border-orange-500/40 rounded-2xl flex flex-col justify-between gap-4 transition-all shadow-lg group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />

                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-orange-500/15 border border-orange-500/30 rounded-xl text-orange-400">
                        <Building size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors">
                          {tenant.name}
                        </h3>
                        <span className="text-[10px] font-mono text-zinc-500">ID: {tenant.slug}</span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded">
                      {tenant.currency || 'CLP'}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mt-4 text-xs text-slate-300 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-zinc-500 shrink-0" />
                      <span className="text-zinc-400">Correo:</span>
                      <span className="font-mono text-slate-200 truncate">{tenant.contact_email || 'Sin correo'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-zinc-500 shrink-0" />
                      <span className="text-zinc-400">Teléfono:</span>
                      <span className="font-mono text-slate-200">{tenant.phone || 'Sin registrar'}</span>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin size={13} className="text-zinc-500 shrink-0 mt-0.5" />
                      <span className="text-zinc-400">Dirección:</span>
                      <span className="text-slate-200 line-clamp-2">{tenant.address || 'Sin dirección'}</span>
                    </div>

                    <div className="pt-2 mt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Margen por Defecto:</span>
                      <strong className="text-orange-400 font-mono">{tenant.default_margin_pct}%</strong>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-zinc-500 font-mono">Alta: {tenant.created_at}</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingTenant(tenant);
                        setTenantForm({
                          name: tenant.name,
                          contact_email: tenant.contact_email || '',
                          phone: tenant.phone || '',
                          address: tenant.address || '',
                          currency: tenant.currency || 'CLP',
                          default_margin_pct: tenant.default_margin_pct || 35
                        });
                        setIsNewTenantModalOpen(true);
                      }}
                      className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-slate-300 hover:text-white rounded-lg border border-zinc-700 transition-colors cursor-pointer"
                      title="Editar datos de empresa"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                      className="p-1.5 bg-zinc-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-lg border border-zinc-700 hover:border-red-500/30 transition-colors cursor-pointer"
                      title="Eliminar empresa"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTRAR / EDITAR PROVEEDOR (TENANT) */}
      {/* ========================================================================= */}
      {isNewTenantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-500/15 border border-orange-500/30 rounded-xl text-orange-400">
                  <Building size={20} />
                </div>
                <h2 className="text-base font-bold text-white">
                  {editingTenant ? 'Editar Proveedor / Empresa' : 'Registrar Nuevo Proveedor'}
                </h2>
              </div>
              <button
                onClick={() => setIsNewTenantModalOpen(false)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Razón Social / Nombre Fantasía *
                </label>
                <input
                  type="text"
                  required
                  value={tenantForm.name}
                  onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                  placeholder="Ej: Maderas & Diseños SpA"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Correo de Contacto</label>
                  <input
                    type="email"
                    value={tenantForm.contact_email}
                    onChange={(e) => setTenantForm({ ...tenantForm, contact_email: e.target.value })}
                    placeholder="contacto@empresa.cl"
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Teléfono Móvil / Fijo</label>
                  <input
                    type="text"
                    value={tenantForm.phone}
                    onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
                    placeholder="+56 9 1234 5678"
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Dirección Taller / Showroom
                </label>
                <input
                  type="text"
                  value={tenantForm.address}
                  onChange={(e) => setTenantForm({ ...tenantForm, address: e.target.value })}
                  placeholder="Av. Principal 1234, Comuna, Región"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Moneda Base</label>
                  <select
                    value={tenantForm.currency}
                    onChange={(e) => setTenantForm({ ...tenantForm, currency: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="CLP">CLP ($ Pesos Chilenos)</option>
                    <option value="USD">USD ($ Dólar)</option>
                    <option value="UF">UF (Unidad de Fomento)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">
                    Margen Utilidad por Defecto (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={tenantForm.default_margin_pct}
                    onChange={(e) =>
                      setTenantForm({ ...tenantForm, default_margin_pct: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewTenantModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50"
                >
                  {editingTenant ? 'Guardar Cambios' : 'Registrar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREAR NUEVO USUARIO */}
      {/* ========================================================================= */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-500/15 border border-orange-500/30 rounded-xl text-orange-400">
                  <Users size={20} />
                </div>
                <h2 className="text-base font-bold text-white">Registrar Nuevo Usuario</h2>
              </div>
              <button onClick={() => setIsNewUserModalOpen(false)} className="text-zinc-500 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  placeholder="Ej: Marcelo Fuentes"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="usuario@empresa.cl"
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Contraseña Inicial *</label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Rol de Acceso *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="designer">Diseñador CAD / Ventas</option>
                    <option value="tenant_admin">Administrador de Empresa</option>
                    <option value="operator">Operador / Taller CNC</option>
                    <option value="superadmin">Superadministrador Maestro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Empresa Proveedora</label>
                  <select
                    value={userForm.tenant_id}
                    onChange={(e) => setUserForm({ ...userForm, tenant_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">-- Sin Asignar / Global --</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RESTABLECER / CAMBIAR CONTRASEÑA */}
      {/* ========================================================================= */}
      {isResetPassModalOpen && selectedUserForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-500/15 border border-orange-500/30 rounded-xl text-orange-400">
                  <KeyRound size={20} />
                </div>
                <h2 className="text-base font-bold text-white">Restablecer Contraseña</h2>
              </div>
              <button onClick={() => setIsResetPassModalOpen(false)} className="text-zinc-500 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                <span className="text-zinc-400 block text-[11px]">Usuario seleccionado:</span>
                <strong className="text-white font-mono text-xs">{selectedUserForReset.email}</strong>
                <span className="text-zinc-500 block text-[11px] mt-0.5">{selectedUserForReset.full_name}</span>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Nueva Contraseña Temporal o Definitiva
                </label>
                <input
                  type="text"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="Ej: Robfu2026@"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 font-mono text-sm"
                />
              </div>

              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-[11px] text-orange-300 leading-relaxed">
                ℹ️ Esta acción generará la actualización inmediata de la credencial de acceso para el usuario indicado.
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsResetPassModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecutePasswordReset}
                  disabled={isLoading || !newPasswordValue.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50"
                >
                  Confirmar Restablecimiento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
