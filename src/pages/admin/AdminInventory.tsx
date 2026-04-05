import React, { useMemo, useState } from 'react';
import { Alert, Badge, Button, Input, Select, Spinner } from '../../components/atoms';
import {
  useCreateInventoryItem,
  useDeleteInventoryItem,
  useInventoryItems,
  useUpdateInventoryItem,
} from '../../hooks/useInventory';
import { ConditionStatus, InventoryType, type FlagInventory } from '../../types';

const inventoryTypeLabels: Record<InventoryType, string> = {
  [InventoryType.FLAG]: 'Bandera',
  [InventoryType.INSTRUMENT]: 'Instrumento',
  [InventoryType.BANNER]: 'Trapo',
  [InventoryType.OTHER]: 'Otro',
};

const inventoryConditionLabels: Record<ConditionStatus, string> = {
  [ConditionStatus.EXCELLENT]: 'Excelente',
  [ConditionStatus.GOOD]: 'Bueno',
  [ConditionStatus.FAIR]: 'Regular',
  [ConditionStatus.POOR]: 'Malo',
};

function parseNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

export const AdminInventory: React.FC = () => {
  const [name, setName] = useState('');
  const [type, setType] = useState<InventoryType>(InventoryType.FLAG);
  const [condition, setCondition] = useState<ConditionStatus>(ConditionStatus.GOOD);
  const [dimensions, setDimensions] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingConditionById, setEditingConditionById] = useState<Record<string, ConditionStatus>>({});

  const { data, isLoading, error } = useInventoryItems();
  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem();
  const deleteMutation = useDeleteInventoryItem();

  const totalCount = data?.length ?? 0;
  const flagsCount = useMemo(
    () => (data ?? []).filter((item) => item.type === InventoryType.FLAG).length,
    [data]
  );

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const sanitizedName = name.trim();
    if (!sanitizedName) {
      setMessage({ type: 'error', text: 'El nombre del elemento es obligatorio.' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: sanitizedName,
        type,
        condition,
        dimensions: parseNullableString(dimensions),
        manufacturer: parseNullableString(manufacturer),
        photo_url: parseNullableString(photoUrl),
        acquisition_date: acquisitionDate || null,
      });
      setName('');
      setType(InventoryType.FLAG);
      setCondition(ConditionStatus.GOOD);
      setDimensions('');
      setManufacturer('');
      setPhotoUrl('');
      setAcquisitionDate('');
      setMessage({ type: 'success', text: 'Elemento agregado al inventario.' });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo crear el elemento de inventario.' });
    }
  };

  const handleDelete = async (itemId: string) => {
    const accepted = globalThis.confirm('Esta acción eliminará el elemento del inventario. ¿Deseas continuar?');
    if (!accepted) return;

    setMessage(null);
    try {
      await deleteMutation.mutateAsync(itemId);
      setMessage({ type: 'success', text: 'Elemento eliminado correctamente.' });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo eliminar el elemento.' });
    }
  };

  const handleConditionUpdate = async (item: FlagInventory) => {
    const selectedCondition = editingConditionById[item.id] ?? item.condition;
    if (selectedCondition === item.condition) return;

    setMessage(null);
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        updates: { condition: selectedCondition },
      });
      setMessage({ type: 'success', text: 'Estado del inventario actualizado.' });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo actualizar el estado del inventario.' });
    }
  };

  const isBusy = createMutation.isPending || deleteMutation.isPending || updateMutation.isPending;
  let inventoryContent: React.ReactNode;

  if (isLoading) {
    inventoryContent = (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  } else if (totalCount > 0) {
    inventoryContent = (
      <div className="bg-white rounded-lg border border-dark-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-dark-50 text-left text-dark-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Elemento</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Adquisición</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((item) => (
              <tr key={item.id} className="border-t border-dark-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-dark-900">{item.name}</p>
                  <p className="text-dark-500">
                    {item.dimensions ?? 'Sin dimensiones'} • {item.manufacturer ?? 'Sin fabricante'}
                  </p>
                </td>
                <td className="px-4 py-3 text-dark-700">{inventoryTypeLabels[item.type]}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      className="min-w-[150px]"
                      value={editingConditionById[item.id] ?? item.condition}
                      onChange={(event) =>
                        setEditingConditionById((prev) => ({
                          ...prev,
                          [item.id]: event.target.value as ConditionStatus,
                        }))
                      }
                      options={Object.values(ConditionStatus).map((value) => ({
                        value,
                        label: inventoryConditionLabels[value],
                      }))}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      isLoading={updateMutation.isPending}
                      onClick={() => {
                        void handleConditionUpdate(item);
                      }}
                    >
                      Guardar
                    </Button>
                  </div>
                </td>
                <td className="px-4 py-3 text-dark-700">
                  {item.acquisition_date
                    ? new Date(item.acquisition_date).toLocaleDateString('es-CO')
                    : 'No registrada'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {item.photo_url !== null && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => globalThis.open(item.photo_url ?? undefined, '_blank', 'noopener,noreferrer')}
                      >
                        Ver foto
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      isLoading={isBusy}
                      onClick={() => {
                        void handleDelete(item.id);
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    inventoryContent = (
      <div className="bg-white rounded-lg border border-dark-200 p-8 text-center text-dark-600">
        No hay elementos de inventario registrados.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-dark-200 p-6">
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Gestión de inventario</h1>
        <p className="text-dark-600">
          Controla banderas, instrumentos y otros activos logísticos de la barra.
        </p>
      </div>

      {message && <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />}

      <div className="bg-white rounded-lg border border-dark-200 p-4 flex flex-wrap items-center gap-3">
        <Badge variant="info">Total elementos: {totalCount}</Badge>
        <Badge variant="primary">Banderas: {flagsCount}</Badge>
      </div>

      <form onSubmit={handleCreate} className="bg-white rounded-lg border border-dark-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-dark-900">Registrar elemento</h2>
        <Input
          label="Nombre"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          placeholder="Ej: Bombo principal norte"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Tipo"
            value={type}
            onChange={(event) => setType(event.target.value as InventoryType)}
            options={Object.values(InventoryType).map((value) => ({
              value,
              label: inventoryTypeLabels[value],
            }))}
          />
          <Select
            label="Estado inicial"
            value={condition}
            onChange={(event) => setCondition(event.target.value as ConditionStatus)}
            options={Object.values(ConditionStatus).map((value) => ({
              value,
              label: inventoryConditionLabels[value],
            }))}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Dimensiones"
            value={dimensions}
            onChange={(event) => setDimensions(event.target.value)}
            placeholder="Ej: 4m x 2m"
          />
          <Input
            label="Fabricante"
            value={manufacturer}
            onChange={(event) => setManufacturer(event.target.value)}
            placeholder="Ej: Taller local"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="URL de foto"
            value={photoUrl}
            onChange={(event) => setPhotoUrl(event.target.value)}
            placeholder="https://..."
          />
          <Input
            label="Fecha de adquisición"
            type="date"
            value={acquisitionDate}
            onChange={(event) => setAcquisitionDate(event.target.value)}
          />
        </div>
        <Button type="submit" variant="primary" isLoading={createMutation.isPending}>
          Guardar en inventario
        </Button>
      </form>

      {error && <Alert type="error" message="No se pudo cargar el inventario." />}
      {inventoryContent}
    </div>
  );
};
