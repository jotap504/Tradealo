'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Coins, ShieldCheck, User as UserIcon, ChevronDown,
  Ban, Clock, Trash2, RotateCcw, Shield, Store,
} from 'lucide-react';
import { admin } from '@/lib/api';
import { type User } from '@/types';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { toast } from '@/lib/store';
import { RelativeTime } from '@/components/ui/RelativeTime';

type RoleFilter = '' | 'user' | 'super_admin' | 'moderator' | 'support' | 'finance' | 'partner';
type KycFilter = '' | '0' | '1' | '2';
type StatusFilter = '' | 'active' | 'suspended' | 'banned' | 'deleted';
type ModalType = 'tokens' | 'suspend' | 'ban' | 'restore' | 'delete' | 'kyc' | 'shop' | null;

function ActionsMenu({ user, onAction }: { user: User; onAction: (type: ModalType, user: User) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const isDead = user.status === 'banned' || user.status === 'deleted';

  return (
    <div ref={ref} className="relative">
      <Button
        size="sm"
        variant="secondary"
        rightIcon={<ChevronDown size={13} />}
        onClick={() => setOpen((v) => !v)}
      >
        Acciones
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-tradealo-border bg-white shadow-lg py-1">
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-tradealo-text hover:bg-tradealo-bg-muted transition-colors"
            onClick={() => { setOpen(false); onAction('tokens', user); }}
          >
            <Coins size={14} /> Ajustar tokens
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-tradealo-text hover:bg-tradealo-bg-muted transition-colors"
            onClick={() => { setOpen(false); onAction('kyc', user); }}
          >
            <Shield size={14} /> Cambiar nivel KYC
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-teal-700 hover:bg-teal-50 transition-colors"
            onClick={() => { setOpen(false); onAction('shop', user); }}
          >
            <Store size={14} /> Tienda
          </button>
          {!isDead && user.status !== 'suspended' && (
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
              onClick={() => { setOpen(false); onAction('suspend', user); }}
            >
              <Clock size={14} /> Suspender
            </button>
          )}
          {!isDead && (
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              onClick={() => { setOpen(false); onAction('ban', user); }}
            >
              <Ban size={14} /> Banear (permanente)
            </button>
          )}
          {(user.status === 'suspended' || user.status === 'banned') && (
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
              onClick={() => { setOpen(false); onAction('restore', user); }}
            >
              <RotateCcw size={14} /> Restaurar acceso
            </button>
          )}
          {user.status !== 'deleted' && (
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors border-t border-tradealo-border mt-1"
              onClick={() => { setOpen(false); onAction('delete', user); }}
            >
              <Trash2 size={14} /> Eliminar usuario
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('');
  const [kycFilter, setKycFilter] = useState<KycFilter>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Tokens modal state
  const [tokenAmount, setTokenAmount] = useState('');
  const [tokenReason, setTokenReason] = useState('');

  // Suspend modal state
  const [suspendDays, setSuspendDays] = useState('');
  const [suspendPermanent, setSuspendPermanent] = useState(false);

  // KYC modal state
  const [kycLevel, setKycLevel] = useState<'0' | '1' | '2'>('0');

  const queryParams = {
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(kycFilter !== '' ? { kycLevel: Number(kycFilter) } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(cursor ? { cursor } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter, kycFilter, statusFilter, search, cursor],
    queryFn: () => admin.getUsers(queryParams),
    staleTime: 60_000,
  });

  const resetFilters = () => {
    setRoleFilter('');
    setKycFilter('');
    setStatusFilter('');
    setSearch('');
    setCursor(undefined);
  };

  const openModal = (type: ModalType, user: User) => {
    setSelectedUser(user);
    setActiveModal(type);
    setTokenAmount('');
    setTokenReason('');
    setSuspendDays('');
    setSuspendPermanent(false);
    setKycLevel(String(user.kycLevel ?? 0) as '0' | '1' | '2');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedUser(null);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const handleTokens = async () => {
    if (!selectedUser) return;
    const amount = Number(tokenAmount);
    if (!tokenAmount || isNaN(amount)) return toast.error('Ingresá un monto válido');
    if (!tokenReason.trim()) return toast.error('Ingresá un motivo');
    setLoading(true);
    try {
      await admin.adjustTokens(selectedUser.id, amount, tokenReason.trim());
      toast.success(`${amount > 0 ? '+' : ''}${amount} tokens aplicados a ${selectedUser.username ?? selectedUser.email}`);
      invalidate();
      closeModal();
    } catch { toast.error('Error al ajustar tokens'); }
    finally { setLoading(false); }
  };

  const handleSuspend = async () => {
    if (!selectedUser) return;
    if (!suspendPermanent && (!suspendDays || isNaN(Number(suspendDays)) || Number(suspendDays) < 1)) {
      return toast.error('Ingresá la cantidad de días');
    }
    setLoading(true);
    try {
      if (suspendPermanent) {
        await admin.suspendUser(selectedUser.id);
        toast.success(`${selectedUser.username ?? selectedUser.email} suspendido indefinidamente`);
      } else {
        await admin.suspendUser(selectedUser.id, Number(suspendDays));
        toast.success(`${selectedUser.username ?? selectedUser.email} suspendido por ${suspendDays} días`);
      }
      invalidate();
      closeModal();
    } catch { toast.error('Error al suspender usuario'); }
    finally { setLoading(false); }
  };

  const handleBan = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await admin.banUser(selectedUser.id);
      toast.success(`${selectedUser.username ?? selectedUser.email} baneado permanentemente`);
      invalidate();
      closeModal();
    } catch { toast.error('Error al banear usuario'); }
    finally { setLoading(false); }
  };

  const handleRestore = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await admin.restoreUser(selectedUser.id);
      toast.success(`Acceso restaurado para ${selectedUser.username ?? selectedUser.email}`);
      invalidate();
      closeModal();
    } catch { toast.error('Error al restaurar usuario'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await admin.deleteUser(selectedUser.id);
      toast.success(`Usuario ${selectedUser.username ?? selectedUser.email} eliminado`);
      invalidate();
      closeModal();
    } catch { toast.error('Error al eliminar usuario'); }
    finally { setLoading(false); }
  };

  const handleKyc = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await admin.setKycLevel(selectedUser.id, Number(kycLevel) as 0 | 1 | 2);
      const label = kycLevel === '2' ? 'Gold' : kycLevel === '1' ? 'Silver' : 'Starter';
      toast.success(`KYC de ${selectedUser.username ?? selectedUser.email} → ${label}`);
      invalidate();
      closeModal();
    } catch { toast.error('Error al cambiar nivel KYC'); }
    finally { setLoading(false); }
  };

  const handleShop = async (action: 'grant' | 'revoke') => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      if (action === 'grant') {
        await admin.grantShop(selectedUser.id);
        toast.success(`Tienda habilitada para ${selectedUser.username ?? selectedUser.email}`);
      } else {
        await admin.revokeShop(selectedUser.id);
        toast.success(`Tienda deshabilitada para ${selectedUser.username ?? selectedUser.email}`);
      }
      invalidate();
      closeModal();
    } catch { toast.error('Error al gestionar tienda'); }
    finally { setLoading(false); }
  };

  const roleVariant = (role: string): 'default' | 'warning' | 'danger' => {
    if (role === 'super_admin') return 'danger';
    if (['moderator', 'support', 'finance', 'partner'].includes(role)) return 'warning';
    return 'default';
  };

  const kycVariant = (level: number): 'default' | 'warning' | 'success' => {
    if (level >= 2) return 'success';
    if (level === 1) return 'warning';
    return 'default';
  };

  const statusBadge = (status?: string) => {
    if (!status || status === 'active') return <Badge variant="success" size="sm">Activo</Badge>;
    if (status === 'suspended') return <Badge variant="warning" size="sm">Suspendido</Badge>;
    if (status === 'banned') return <Badge variant="danger" size="sm">Baneado</Badge>;
    if (status === 'deleted') return <Badge variant="default" size="sm">Eliminado</Badge>;
    return <Badge variant="default" size="sm">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-tradealo-text">Usuarios</h1>

      {/* Filters */}
      <Card>
        <CardBody className="p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <input
              type="search"
              placeholder="Buscar por email o username…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCursor(undefined); }}
              className="w-full sm:w-56 rounded-lg border border-tradealo-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary"
            />
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value as RoleFilter); setCursor(undefined); }}
                className="rounded-lg border border-tradealo-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary"
              >
                <option value="">Todos los roles</option>
                <option value="user">Usuario</option>
                <option value="moderator">Moderador</option>
                <option value="support">Soporte</option>
                <option value="finance">Finanzas</option>
                <option value="partner">Partner</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <select
                value={kycFilter}
                onChange={(e) => { setKycFilter(e.target.value as KycFilter); setCursor(undefined); }}
                className="rounded-lg border border-tradealo-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary"
              >
                <option value="">Todos los KYC</option>
                <option value="0">Starter</option>
                <option value="1">Silver</option>
                <option value="2">Gold</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setCursor(undefined); }}
                className="rounded-lg border border-tradealo-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary"
              >
                <option value="">Todos los estados</option>
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
                <option value="banned">Baneado</option>
                <option value="deleted">Eliminado</option>
              </select>
              {(roleFilter || kycFilter || statusFilter || search) && (
                <Button size="sm" variant="ghost" onClick={resetFilters}>Limpiar</Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardBody>
          {isLoading ? (
            <Skeleton variant="card" className="h-64" />
          ) : !data?.data?.length ? (
            <div className="text-center py-12">
              <UserIcon size={40} className="mx-auto text-tradealo-text-muted mb-3" />
              <p className="text-sm text-tradealo-text-muted">No se encontraron usuarios.</p>
            </div>
          ) : (
            <>
              {/* Mobile cards — visible only on small screens */}
              <div className="flex flex-col divide-y divide-tradealo-border md:hidden">
                {(data.data as User[]).map((u) => (
                  <div key={u.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar src={u.avatarUrl} username={u.username ?? u.email} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-tradealo-text text-sm truncate">
                          {u.username ?? '—'}
                        </p>
                        <p className="text-xs text-tradealo-text-muted truncate">{u.email}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant={roleVariant(u.role)} size="sm">{u.role}</Badge>
                          <Badge variant={kycVariant(u.kycLevel)} size="sm">
                            {u.kycLevel === 2 ? 'Gold' : u.kycLevel === 1 ? 'Silver' : 'Starter'}
                          </Badge>
                          {statusBadge(u.status)}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <ActionsMenu user={u} onAction={openModal} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table — hidden on small screens */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-tradealo-border text-left text-tradealo-text-muted text-xs">
                      <th className="pb-2 font-medium">Usuario</th>
                      <th className="pb-2 font-medium hidden lg:table-cell">Email</th>
                      <th className="pb-2 font-medium">Rol</th>
                      <th className="pb-2 font-medium">KYC</th>
                      <th className="pb-2 font-medium">Estado</th>
                      <th className="pb-2 font-medium hidden lg:table-cell">Registro</th>
                      <th className="pb-2 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.data as User[]).map((u) => (
                      <tr key={u.id} className="border-b border-tradealo-border last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Avatar src={u.avatarUrl} username={u.username ?? u.email} size="sm" />
                            <div className="min-w-0">
                              <span className="font-medium text-tradealo-text block truncate max-w-[120px]">
                                {u.username ?? '—'}
                              </span>
                              <span className="text-xs text-tradealo-text-muted block truncate max-w-[120px] lg:hidden">
                                {u.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-tradealo-text-muted text-xs hidden lg:table-cell">
                          {u.email}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={roleVariant(u.role)} size="sm">{u.role}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1">
                            {u.kycLevel >= 2 && <ShieldCheck size={13} className="text-tradealo-success shrink-0" />}
                            <Badge variant={kycVariant(u.kycLevel)} size="sm">
                              {u.kycLevel === 2 ? 'Gold' : u.kycLevel === 1 ? 'Silver' : 'Starter'}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 pr-4">{statusBadge(u.status)}</td>
                        <td className="py-3 pr-4 text-tradealo-text-muted text-xs whitespace-nowrap hidden lg:table-cell">
                          {u.createdAt ? <RelativeTime iso={u.createdAt} /> : '—'}
                        </td>
                        <td className="py-3">
                          <ActionsMenu user={u} onAction={openModal} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(cursor || data.nextCursor) && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-tradealo-border">
                  <Button size="sm" variant="secondary" disabled={!cursor} onClick={() => setCursor(undefined)}>
                    Primera página
                  </Button>
                  <Button size="sm" variant="secondary" disabled={!data.nextCursor} onClick={() => setCursor(data.nextCursor)}>
                    Siguiente →
                  </Button>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* ── Tokens modal ── */}
      <Modal
        open={activeModal === 'tokens'}
        onClose={closeModal}
        title={`Ajustar tokens — ${selectedUser?.username ?? selectedUser?.email ?? ''}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-tradealo-text-muted">Positivo para acreditar, negativo para debitar.</p>
          <Input label="Cantidad" type="number" value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)} placeholder="Ej: 10 o -5" />
          <Input label="Motivo" value={tokenReason} onChange={(e) => setTokenReason(e.target.value)} placeholder="Ej: Compensación por error técnico" />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={closeModal}>Cancelar</Button>
            <Button fullWidth loading={loading} onClick={handleTokens}>Confirmar</Button>
          </div>
        </div>
      </Modal>

      {/* ── Suspend modal ── */}
      <Modal
        open={activeModal === 'suspend'}
        onClose={closeModal}
        title={`Suspender — ${selectedUser?.username ?? selectedUser?.email ?? ''}`}
        size="sm"
      >
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={suspendPermanent}
              onChange={(e) => setSuspendPermanent(e.target.checked)}
              className="accent-tradealo-primary"
            />
            <span className="text-sm text-tradealo-text">Suspensión indefinida (sin fecha de fin)</span>
          </label>
          {!suspendPermanent && (
            <Input
              label="Días de suspensión"
              type="number"
              min="1"
              value={suspendDays}
              onChange={(e) => setSuspendDays(e.target.value)}
              placeholder="Ej: 7"
            />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={closeModal}>Cancelar</Button>
            <Button variant="danger" fullWidth loading={loading} onClick={handleSuspend}>
              {suspendPermanent ? 'Suspender indefinidamente' : 'Suspender'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Ban modal ── */}
      <Modal
        open={activeModal === 'ban'}
        onClose={closeModal}
        title={`Banear permanentemente — ${selectedUser?.username ?? selectedUser?.email ?? ''}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-tradealo-text-muted">
            Esta acción es <strong>irreversible</strong>. El usuario no podrá iniciar sesión ni recuperar su cuenta.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={closeModal}>Cancelar</Button>
            <Button variant="danger" fullWidth loading={loading} onClick={handleBan}>Banear permanentemente</Button>
          </div>
        </div>
      </Modal>

      {/* ── Restore modal ── */}
      <Modal
        open={activeModal === 'restore'}
        onClose={closeModal}
        title={`Restaurar acceso — ${selectedUser?.username ?? selectedUser?.email ?? ''}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-tradealo-text-muted">
            El usuario volverá a tener acceso completo a la plataforma.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={closeModal}>Cancelar</Button>
            <Button fullWidth loading={loading} onClick={handleRestore}>Restaurar acceso</Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete modal ── */}
      <Modal
        open={activeModal === 'delete'}
        onClose={closeModal}
        title={`Eliminar cuenta — ${selectedUser?.username ?? selectedUser?.email ?? ''}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-tradealo-text-muted">
            La cuenta quedará marcada como eliminada. Los datos permanecen en la base de datos por cumplimiento legal.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={closeModal}>Cancelar</Button>
            <Button variant="danger" fullWidth loading={loading} onClick={handleDelete}>Eliminar cuenta</Button>
          </div>
        </div>
      </Modal>

      {/* ── Shop modal ── */}
      <Modal
        open={activeModal === 'shop'}
        onClose={closeModal}
        title={`Gestionar Tienda — ${selectedUser?.username ?? selectedUser?.email ?? ''}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-tradealo-text-muted">
            Habilitá o deshabilitá el acceso a la tienda premium para este usuario sin necesidad de suscripción de pago.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              fullWidth
              loading={loading}
              onClick={() => handleShop('grant')}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Habilitar tienda
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={loading}
              onClick={() => handleShop('revoke')}
            >
              Deshabilitar tienda
            </Button>
          </div>
          <Button variant="secondary" fullWidth onClick={closeModal}>Cancelar</Button>
        </div>
      </Modal>

      {/* ── KYC level modal ── */}
      <Modal
        open={activeModal === 'kyc'}
        onClose={closeModal}
        title={`Cambiar nivel KYC — ${selectedUser?.username ?? selectedUser?.email ?? ''}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-tradealo-text-muted">
            Nivel actual: <strong>{selectedUser?.kycLevel === 2 ? 'Gold (2)' : selectedUser?.kycLevel === 1 ? 'Silver (1)' : 'Starter (0)'}</strong>
          </p>
          <div className="flex flex-col gap-2">
            {(['0', '1', '2'] as const).map((lvl) => (
              <label key={lvl} className="flex items-center gap-3 cursor-pointer rounded-lg border border-tradealo-border p-3 hover:bg-tradealo-bg-muted transition-colors">
                <input
                  type="radio"
                  name="kycLevel"
                  value={lvl}
                  checked={kycLevel === lvl}
                  onChange={() => setKycLevel(lvl)}
                  className="accent-tradealo-primary"
                />
                <div>
                  <p className="text-sm font-medium text-tradealo-text">
                    {lvl === '2' ? 'Gold (Nivel 2)' : lvl === '1' ? 'Silver (Nivel 1)' : 'Starter (Nivel 0)'}
                  </p>
                  <p className="text-xs text-tradealo-text-muted">
                    {lvl === '2' ? 'BCRA + documentación completa' : lvl === '1' ? 'Identidad verificada (DNI/selfie)' : 'Sin verificación'}
                  </p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={closeModal}>Cancelar</Button>
            <Button fullWidth loading={loading} onClick={handleKyc}>Cambiar nivel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
