'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, ShieldCheck, User as UserIcon } from 'lucide-react';
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

type RoleFilter = '' | 'user' | 'super_admin' | 'moderator';
type KycFilter = '' | '0' | '1' | '2';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('');
  const [kycFilter, setKycFilter] = useState<KycFilter>('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [adjustingUser, setAdjustingUser] = useState<User | null>(null);
  const [tokenAmount, setTokenAmount] = useState('');
  const [tokenReason, setTokenReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const queryParams = {
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(kycFilter !== '' ? { kycLevel: Number(kycFilter) } : {}),
    ...(cursor ? { cursor } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter, kycFilter, cursor],
    queryFn: () => admin.getUsers(queryParams),
    staleTime: 60_000,
  });

  const resetFilters = () => {
    setRoleFilter('');
    setKycFilter('');
    setCursor(undefined);
  };

  const handleAdjustTokens = async () => {
    if (!adjustingUser) return;
    const amount = Number(tokenAmount);
    if (!tokenAmount || isNaN(amount)) {
      toast.error('Ingresá un monto válido');
      return;
    }
    if (!tokenReason.trim()) {
      toast.error('Ingresá un motivo');
      return;
    }
    setAdjusting(true);
    try {
      await admin.adjustTokens(adjustingUser.id, amount, tokenReason.trim());
      toast.success(
        `${amount > 0 ? '+' : ''}${amount} tokens ${amount > 0 ? 'acreditados' : 'debitados'} a ${adjustingUser.username ?? adjustingUser.email}`
      );
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setAdjustingUser(null);
      setTokenAmount('');
      setTokenReason('');
    } catch {
      toast.error('Error al ajustar tokens');
    } finally {
      setAdjusting(false);
    }
  };

  const roleVariant = (role: User['role']): 'default' | 'warning' | 'danger' => {
    if (role === 'super_admin') return 'danger';
    if (role === 'moderator') return 'warning';
    return 'default';
  };

  const kycVariant = (level: number): 'default' | 'warning' | 'success' => {
    if (level >= 2) return 'success';
    if (level === 1) return 'warning';
    return 'default';
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-tradealo-text">
        Usuarios
      </h1>

      {/* Filters */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-tradealo-text-muted whitespace-nowrap">
              Rol:
            </label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as RoleFilter);
                setCursor(undefined);
              }}
              className="rounded-lg border border-tradealo-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary"
            >
              <option value="">Todos</option>
              <option value="user">Usuario</option>
              <option value="moderator">Moderador</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-tradealo-text-muted whitespace-nowrap">
              KYC:
            </label>
            <select
              value={kycFilter}
              onChange={(e) => {
                setKycFilter(e.target.value as KycFilter);
                setCursor(undefined);
              }}
              className="rounded-lg border border-tradealo-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary"
            >
              <option value="">Todos</option>
              <option value="0">Nivel 0</option>
              <option value="1">Nivel 1</option>
              <option value="2">Nivel 2</option>
            </select>
          </div>

          {(roleFilter || kycFilter) && (
            <Button size="sm" variant="ghost" onClick={resetFilters}>
              Limpiar filtros
            </Button>
          )}
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
              <p className="text-sm text-tradealo-text-muted">
                No se encontraron usuarios.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-tradealo-border text-left text-tradealo-text-muted text-xs">
                      <th className="pb-2 font-medium">Usuario</th>
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Rol</th>
                      <th className="pb-2 font-medium">KYC</th>
                      <th className="pb-2 font-medium">Registro</th>
                      <th className="pb-2 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-tradealo-border last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={u.avatarUrl}
                              username={u.username ?? u.email}
                              size="sm"
                            />
                            <span className="font-medium text-tradealo-text">
                              {u.username ?? '—'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-tradealo-text-muted">
                          {u.email}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={roleVariant(u.role)} size="sm">
                            {u.role}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            {u.kycLevel >= 2 && (
                              <ShieldCheck
                                size={14}
                                className="text-tradealo-success shrink-0"
                              />
                            )}
                            <Badge variant={kycVariant(u.kycLevel)} size="sm">
                              Nivel {u.kycLevel}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-tradealo-text-muted whitespace-nowrap">
                          {u.createdAt ? <RelativeTime iso={u.createdAt} /> : '—'}
                        </td>
                        <td className="py-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<Coins size={13} />}
                            onClick={() => {
                              setAdjustingUser(u);
                              setTokenAmount('');
                              setTokenReason('');
                            }}
                          >
                            Tokens
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {(cursor || data.nextCursor) && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-tradealo-border">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!cursor}
                    onClick={() => setCursor(undefined)}
                  >
                    Primera página
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!data.nextCursor}
                    onClick={() => setCursor(data.nextCursor)}
                  >
                    Siguiente →
                  </Button>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Adjust tokens modal */}
      <Modal
        open={!!adjustingUser}
        onClose={() => setAdjustingUser(null)}
        title={`Ajustar tokens — ${adjustingUser?.username ?? adjustingUser?.email ?? ''}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-tradealo-text-muted">
            Usá un valor positivo para acreditar tokens y negativo para debitarlos.
          </p>
          <Input
            label="Cantidad (positivo o negativo)"
            type="number"
            value={tokenAmount}
            onChange={(e) => setTokenAmount(e.target.value)}
            placeholder="Ej: 10 o -5"
          />
          <Input
            label="Motivo"
            value={tokenReason}
            onChange={(e) => setTokenReason(e.target.value)}
            placeholder="Ej: Compensación por error técnico"
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setAdjustingUser(null)}
            >
              Cancelar
            </Button>
            <Button fullWidth loading={adjusting} onClick={handleAdjustTokens}>
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
