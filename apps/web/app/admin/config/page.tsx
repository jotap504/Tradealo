'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { admin } from '@/lib/api';
import { type SystemConfig } from '@/types';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/lib/store';

function ConfigTypeLabel({ dataType }: { dataType: SystemConfig['dataType'] }) {
  const map: Record<SystemConfig['dataType'], 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
    string: 'default',
    number: 'primary',
    boolean: 'success',
    json: 'warning',
  };
  return (
    <Badge variant={map[dataType]} size="sm">
      {dataType}
    </Badge>
  );
}

function ConfigValueDisplay({ config }: { config: SystemConfig }) {
  if (config.dataType === 'boolean') {
    const isTrue = config.value === 'true' || config.value === '1';
    return (
      <Badge variant={isTrue ? 'success' : 'danger'} size="sm">
        {isTrue ? 'true' : 'false'}
      </Badge>
    );
  }
  if (config.dataType === 'json') {
    return (
      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono truncate max-w-[200px] block">
        {config.value}
      </code>
    );
  }
  return (
    <span className="text-sm text-tradealo-text">{config.value}</span>
  );
}

export default function AdminConfigPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<SystemConfig | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: configs, isLoading } = useQuery({
    queryKey: ['admin-configs'],
    queryFn: () => admin.getConfigs(),
    staleTime: 60_000,
  });

  // Group configs by category
  const grouped = (configs ?? []).reduce<Record<string, SystemConfig[]>>(
    (acc, cfg) => {
      if (!acc[cfg.category]) acc[cfg.category] = [];
      acc[cfg.category].push(cfg);
      return acc;
    },
    {}
  );

  const toggleCategory = (category: string) => {
    setExpanded((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const openEdit = (cfg: SystemConfig) => {
    setEditing(cfg);
    setEditValue(cfg.value);
    setEditReason('');
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await admin.updateConfig(editing.key, editValue, editReason || 'Actualización manual');
      toast.success('Configuración actualizada');
      queryClient.invalidateQueries({ queryKey: ['admin-configs'] });
      setEditing(null);
    } catch {
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const renderEditInput = () => {
    if (!editing) return null;

    if (editing.dataType === 'boolean') {
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-tradealo-text mb-1.5">
            Valor
          </label>
          <div className="flex gap-3">
            {['true', 'false'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setEditValue(opt)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  editValue === opt
                    ? 'bg-tradealo-primary text-white border-tradealo-primary'
                    : 'border-tradealo-border text-tradealo-text hover:border-tradealo-primary'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (editing.dataType === 'number') {
      return (
        <Input
          label="Valor"
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          helper={editing.description}
        />
      );
    }

    if (editing.dataType === 'json') {
      return (
        <div>
          <label className="block text-sm font-medium text-tradealo-text mb-1.5">
            Valor (JSON)
          </label>
          <textarea
            className="w-full rounded-lg border border-tradealo-border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary resize-none"
            rows={5}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
          {editing.description && (
            <p className="mt-1 text-xs text-tradealo-text-muted">{editing.description}</p>
          )}
        </div>
      );
    }

    return (
      <Input
        label="Valor"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        helper={editing.description}
      />
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-tradealo-text">
        Configuración del sistema
      </h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-32" />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-tradealo-text-muted">
              No hay configuraciones disponibles.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([category, items]) => {
            const isOpen = expanded[category] !== false;
            return (
              <Card key={category}>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors rounded-xl"
                  onClick={() => toggleCategory(category)}
                >
                  <span className="font-heading font-semibold text-tradealo-text capitalize">
                    {category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-tradealo-text-muted">
                      {items.length} entradas
                    </span>
                    {isOpen ? (
                      <ChevronDown size={16} className="text-tradealo-text-muted" />
                    ) : (
                      <ChevronRight size={16} className="text-tradealo-text-muted" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[500px]">
                        <thead>
                          <tr className="border-b border-tradealo-border text-left text-tradealo-text-muted text-xs">
                            <th className="pb-2 font-medium">Clave</th>
                            <th className="pb-2 font-medium">Descripción</th>
                            <th className="pb-2 font-medium">Valor actual</th>
                            <th className="pb-2 font-medium">Tipo</th>
                            <th className="pb-2 font-medium">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((cfg) => (
                            <tr
                              key={cfg.key}
                              className="border-b border-tradealo-border last:border-0"
                            >
                              <td className="py-3 pr-4 font-mono text-xs text-tradealo-text-muted whitespace-nowrap">
                                {cfg.key}
                              </td>
                              <td className="py-3 pr-4 text-tradealo-text-muted max-w-[200px]">
                                {cfg.description ?? '—'}
                              </td>
                              <td className="py-3 pr-4">
                                <ConfigValueDisplay config={cfg} />
                              </td>
                              <td className="py-3 pr-4">
                                <ConfigTypeLabel dataType={cfg.dataType} />
                              </td>
                              <td className="py-3">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  leftIcon={<Pencil size={13} />}
                                  onClick={() => openEdit(cfg)}
                                >
                                  Editar
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Editar: ${editing?.key ?? ''}`}
        size="sm"
      >
        <div className="space-y-4">
          {editing?.description && (
            <p className="text-sm text-tradealo-text-muted">{editing.description}</p>
          )}
          {renderEditInput()}
          <div>
            <label className="block text-sm font-medium text-tradealo-text mb-1.5">
              Razón del cambio
            </label>
            <input
              className="w-full rounded-lg border border-tradealo-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary"
              placeholder="Ej: Ajuste por campaña de verano"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button fullWidth loading={saving} onClick={handleSave}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
