'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, Star, Pencil, Plus, Check, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { admin } from '@/lib/api';
import { type AdminTokenPack } from '@/types';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/lib/store';

interface PackForm {
  key: string;
  label: string;
  tokens: string;
  bonusPct: string;
  priceArs: string;
  isFeatured: boolean;
  sortOrder: string;
}

const emptyForm = (): PackForm => ({
  key: '',
  label: '',
  tokens: '',
  bonusPct: '0',
  priceArs: '',
  isFeatured: false,
  sortOrder: '0',
});

export default function AdminTokenPacksPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<PackForm>(emptyForm());
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PackForm> & { priceId?: string }>({});
  const [saving, setSaving] = useState(false);

  const { data: packs, isLoading } = useQuery({
    queryKey: ['admin-token-packs'],
    queryFn: () => admin.getTokenPacks(),
    staleTime: 60_000,
  });

  const startEdit = (pack: AdminTokenPack) => {
    const arsPrice = pack.prices.find((p) => p.countryCode === 'AR');
    setEditingId(pack.id);
    setEditForm({
      label: pack.label,
      tokens: String(pack.tokens),
      bonusPct: String(pack.bonusPct),
      isFeatured: pack.isFeatured,
      sortOrder: String(pack.sortOrder),
      priceId: arsPrice?.id,
      priceArs: arsPrice?.price ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (pack: AdminTokenPack) => {
    setSaving(true);
    try {
      await admin.updateTokenPack(pack.id, {
        label: editForm.label,
        tokens: editForm.tokens ? Number(editForm.tokens) : undefined,
        bonusPct: editForm.bonusPct !== undefined ? Number(editForm.bonusPct) : undefined,
        isFeatured: editForm.isFeatured,
        sortOrder: editForm.sortOrder !== undefined ? Number(editForm.sortOrder) : undefined,
      });
      if (editForm.priceId && editForm.priceArs) {
        await admin.updateTokenPackPrice(editForm.priceId, editForm.priceArs);
      }
      toast.success('Pack actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-token-packs'] });
      queryClient.invalidateQueries({ queryKey: ['token-packs'] });
      cancelEdit();
    } catch {
      toast.error('Error al actualizar el pack');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (pack: AdminTokenPack) => {
    try {
      await admin.updateTokenPack(pack.id, { isActive: !pack.isActive });
      toast.success(pack.isActive ? 'Pack desactivado' : 'Pack activado');
      queryClient.invalidateQueries({ queryKey: ['admin-token-packs'] });
      queryClient.invalidateQueries({ queryKey: ['token-packs'] });
    } catch {
      toast.error('Error al cambiar estado del pack');
    }
  };

  const handleCreate = async () => {
    if (!createForm.key || !createForm.label || !createForm.tokens || !createForm.priceArs) {
      toast.error('Completá los campos obligatorios');
      return;
    }
    setCreating(true);
    try {
      await admin.createTokenPack({
        key: createForm.key,
        label: createForm.label,
        tokens: Number(createForm.tokens),
        bonusPct: Number(createForm.bonusPct) || 0,
        isFeatured: createForm.isFeatured,
        sortOrder: Number(createForm.sortOrder) || 0,
        priceArs: createForm.priceArs,
      });
      toast.success('Pack creado');
      queryClient.invalidateQueries({ queryKey: ['admin-token-packs'] });
      queryClient.invalidateQueries({ queryKey: ['token-packs'] });
      setCreateOpen(false);
      setCreateForm(emptyForm());
    } catch {
      toast.error('Error al crear el pack');
    } finally {
      setCreating(false);
    }
  };

  const updateCreate = (field: keyof PackForm, value: string | boolean) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));

  const updateEdit = (field: string, value: string | boolean) =>
    setEditForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-tradealo-text">Token Packs</h1>
        <Button leftIcon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          Nuevo pack
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-16" />
          ))}
        </div>
      ) : !packs?.length ? (
        <Card>
          <CardBody className="text-center py-12">
            <Coins size={40} className="mx-auto text-tradealo-text-muted mb-3" />
            <p className="text-sm text-tradealo-text-muted mb-4">No hay packs de tokens configurados.</p>
            <Button leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
              Crear primer pack
            </Button>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-tradealo-border text-left text-tradealo-text-muted text-xs">
                    <th className="pb-2 font-medium">Nombre</th>
                    <th className="pb-2 font-medium">Tokens</th>
                    <th className="pb-2 font-medium">Bonus %</th>
                    <th className="pb-2 font-medium">Precio ARS</th>
                    <th className="pb-2 font-medium">Destacado</th>
                    <th className="pb-2 font-medium">Estado</th>
                    <th className="pb-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {packs.map((pack) => {
                    const isEditing = editingId === pack.id;
                    const arsPrice = pack.prices.find((p) => p.countryCode === 'AR');
                    return (
                      <tr key={pack.id} className="border-b border-tradealo-border last:border-0">
                        {isEditing ? (
                          <>
                            <td className="py-2 pr-2">
                              <Input
                                value={editForm.label ?? ''}
                                onChange={(e) => updateEdit('label', e.target.value)}
                              />
                            </td>
                            <td className="py-2 pr-2">
                              <Input
                                type="number"
                                value={editForm.tokens ?? ''}
                                onChange={(e) => updateEdit('tokens', e.target.value)}
                              />
                            </td>
                            <td className="py-2 pr-2">
                              <Input
                                type="number"
                                value={editForm.bonusPct ?? ''}
                                onChange={(e) => updateEdit('bonusPct', e.target.value)}
                              />
                            </td>
                            <td className="py-2 pr-2">
                              <Input
                                type="number"
                                value={editForm.priceArs ?? ''}
                                onChange={(e) => updateEdit('priceArs', e.target.value)}
                              />
                            </td>
                            <td className="py-2 pr-2">
                              <button
                                type="button"
                                onClick={() => updateEdit('isFeatured', !editForm.isFeatured)}
                                className="text-tradealo-primary"
                              >
                                {editForm.isFeatured
                                  ? <ToggleRight size={22} />
                                  : <ToggleLeft size={22} className="text-gray-400" />}
                              </button>
                            </td>
                            <td className="py-2 pr-2" />
                            <td className="py-2">
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  leftIcon={<Check size={13} />}
                                  loading={saving}
                                  onClick={() => saveEdit(pack)}
                                >
                                  Guardar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  leftIcon={<X size={13} />}
                                  onClick={cancelEdit}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 pr-4 font-medium text-tradealo-text">
                              {pack.label}
                              <p className="text-xs text-tradealo-text-muted font-normal">{pack.key}</p>
                            </td>
                            <td className="py-3 pr-4 font-heading font-bold text-tradealo-primary">
                              {pack.tokens.toLocaleString('es-AR')}
                            </td>
                            <td className="py-3 pr-4">
                              {pack.bonusPct > 0
                                ? <Badge variant="success" size="sm">+{pack.bonusPct}%</Badge>
                                : <span className="text-tradealo-text-muted">—</span>}
                            </td>
                            <td className="py-3 pr-4 font-medium">
                              {arsPrice
                                ? `$${Number(arsPrice.price).toLocaleString('es-AR')} ARS`
                                : <span className="text-tradealo-text-muted">—</span>}
                            </td>
                            <td className="py-3 pr-4">
                              {pack.isFeatured
                                ? <Badge variant="warning" size="sm"><Star size={11} className="inline mr-0.5" />Sí</Badge>
                                : <span className="text-tradealo-text-muted">—</span>}
                            </td>
                            <td className="py-3 pr-4">
                              <Badge variant={pack.isActive ? 'success' : 'danger'} size="sm">
                                {pack.isActive ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  leftIcon={<Pencil size={13} />}
                                  onClick={() => startEdit(pack)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant={pack.isActive ? 'danger' : 'secondary'}
                                  onClick={() => toggleActive(pack)}
                                >
                                  {pack.isActive ? 'Desactivar' : 'Activar'}
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateForm(emptyForm()); }}
        title="Nuevo pack de tokens"
        size="sm"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Clave única *"
              placeholder="starter_100"
              value={createForm.key}
              onChange={(e) => updateCreate('key', e.target.value)}
            />
            <Input
              label="Nombre visible *"
              placeholder="Pack Inicial"
              value={createForm.label}
              onChange={(e) => updateCreate('label', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tokens *"
              type="number"
              placeholder="100"
              value={createForm.tokens}
              onChange={(e) => updateCreate('tokens', e.target.value)}
            />
            <Input
              label="Precio ARS *"
              type="number"
              placeholder="1500"
              value={createForm.priceArs}
              onChange={(e) => updateCreate('priceArs', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Bonus %"
              type="number"
              placeholder="0"
              value={createForm.bonusPct}
              onChange={(e) => updateCreate('bonusPct', e.target.value)}
            />
            <Input
              label="Orden de visualización"
              type="number"
              placeholder="0"
              value={createForm.sortOrder}
              onChange={(e) => updateCreate('sortOrder', e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              onClick={() => updateCreate('isFeatured', !createForm.isFeatured)}
              className="text-tradealo-primary"
            >
              {createForm.isFeatured
                ? <ToggleRight size={24} />
                : <ToggleLeft size={24} className="text-gray-400" />}
            </button>
            <span className="text-sm text-tradealo-text">Marcar como Popular / Destacado</span>
          </label>
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => { setCreateOpen(false); setCreateForm(emptyForm()); }}
            >
              Cancelar
            </Button>
            <Button fullWidth loading={creating} onClick={handleCreate}>
              Crear pack
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
