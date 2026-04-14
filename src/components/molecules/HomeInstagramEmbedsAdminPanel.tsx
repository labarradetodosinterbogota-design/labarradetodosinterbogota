import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Clapperboard, Trash2 } from 'lucide-react';
import { Alert, Button, Input, Spinner } from '../atoms';
import {
  useCreateInstagramEmbed,
  useDeleteInstagramEmbed,
  useHomepageInstagramEmbeds,
  useHomepageInstagramProfile,
  useMoveInstagramEmbed,
  useSaveInstagramProfileUrl,
  useUpdateInstagramEmbed,
} from '../../hooks/useHomepageInstagramEmbeds';
import { buildInstagramEmbedSrc } from '../../utils/instagramEmbedUrl';
import type { HomepageInstagramEmbedRow } from '../../types';

function EmbedRowEditor({
  row,
  busy,
  onSave,
  onCancel,
}: Readonly<{
  row: HomepageInstagramEmbedRow;
  busy: boolean;
  onSave: (title: string | null, permalink: string) => void;
  onCancel: () => void;
}>) {
  const [title, setTitle] = useState(row.title ?? '');
  const [permalink, setPermalink] = useState(row.permalink);

  return (
    <div className="rounded-lg border border-primary-200 bg-primary-50/40 p-4 space-y-3">
      <Input label="Título (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
      <Input label="Enlace del post o reel" value={permalink} onChange={(e) => setPermalink(e.target.value)} disabled={busy} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" size="sm" disabled={busy} onClick={() => onSave(title.trim() || null, permalink.trim())}>
          Guardar
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export const HomeInstagramEmbedsAdminPanel: React.FC = () => {
  const embedsQuery = useHomepageInstagramEmbeds();
  const profileQuery = useHomepageInstagramProfile();
  const saveProfile = useSaveInstagramProfileUrl();
  const createEmbed = useCreateInstagramEmbed();
  const updateEmbed = useUpdateInstagramEmbed();
  const deleteEmbed = useDeleteInstagramEmbed();
  const moveEmbed = useMoveInstagramEmbed();

  const [profileInput, setProfileInput] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newPermalink, setNewPermalink] = useState('');
  const [panelError, setPanelError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (profileQuery.data !== undefined) {
      setProfileInput(profileQuery.data ?? '');
    }
  }, [profileQuery.data]);

  const busy =
    saveProfile.isPending ||
    createEmbed.isPending ||
    updateEmbed.isPending ||
    deleteEmbed.isPending ||
    moveEmbed.isPending;

  const rows = embedsQuery.data ?? [];

  const handleSaveProfile = async () => {
    setPanelError(null);
    try {
      await saveProfile.mutateAsync(profileInput.trim() === '' ? null : profileInput.trim());
    } catch (e) {
      setPanelError(e instanceof Error ? e.message : 'No se pudo guardar el perfil.');
    }
  };

  const handleAddEmbed = async () => {
    setPanelError(null);
    const p = newPermalink.trim();
    if (!p) {
      setPanelError('Pega el enlace del reel o publicación de Instagram.');
      return;
    }
    if (!buildInstagramEmbedSrc(p)) {
      setPanelError('El enlace debe ser de instagram.com y contener /reel/, /p/ o /tv/.');
      return;
    }
    try {
      await createEmbed.mutateAsync({ title: newTitle.trim() || null, permalink: p });
      setNewTitle('');
      setNewPermalink('');
    } catch (e) {
      setPanelError(e instanceof Error ? e.message : 'No se pudo añadir el video.');
    }
  };

  const handleDelete = async (id: string) => {
    setPanelError(null);
    const ok = globalThis.confirm('¿Quitar este video de la página de inicio?');
    if (!ok) return;
    try {
      await deleteEmbed.mutateAsync(id);
      if (editingId === id) setEditingId(null);
    } catch (e) {
      setPanelError(e instanceof Error ? e.message : 'No se pudo eliminar.');
    }
  };

  const handleSaveEdit = async (id: string, title: string | null, permalink: string) => {
    setPanelError(null);
    if (!buildInstagramEmbedSrc(permalink)) {
      setPanelError('El enlace debe ser de instagram.com y contener /reel/, /p/ o /tv/.');
      return;
    }
    try {
      await updateEmbed.mutateAsync({ id, title, permalink });
      setEditingId(null);
    } catch (e) {
      setPanelError(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    setPanelError(null);
    try {
      await moveEmbed.mutateAsync({ id, direction });
    } catch (e) {
      setPanelError(e instanceof Error ? e.message : 'No se pudo reordenar.');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-dark-200 p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Clapperboard className="w-6 h-6 text-primary-400" aria-hidden />
        <h3 className="font-semibold text-dark-900">Videos en la página de inicio (Instagram)</h3>
      </div>
      <p className="text-sm text-dark-600">
        Los cambios se publican al instante en el sitio público. Usa el enlace copiado desde Instagram (menú Compartir →
        Copiar enlace).
      </p>

      {panelError && <Alert type="error" message={panelError} />}

      <div className="rounded-lg border border-dark-100 bg-dark-50/40 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-dark-900">Perfil oficial (opcional)</h4>
        <p className="text-xs text-dark-500">URL del perfil para el botón «Ver perfil en Instagram» en la home.</p>
        <Input
          label="URL del perfil"
          type="url"
          placeholder="https://www.instagram.com/tu_barra/"
          value={profileInput}
          onChange={(e) => setProfileInput(e.target.value)}
          disabled={busy || profileQuery.isLoading}
        />
        <Button type="button" variant="secondary" size="sm" disabled={busy || profileQuery.isLoading} onClick={() => void handleSaveProfile()}>
          Guardar perfil
        </Button>
      </div>

      <div className="rounded-lg border border-dark-100 bg-dark-50/40 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-dark-900">Añadir video</h4>
        <Input label="Título (opcional)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} disabled={busy} />
        <Input
          label="Enlace del reel o publicación"
          type="url"
          placeholder="https://www.instagram.com/reel/…"
          value={newPermalink}
          onChange={(e) => setNewPermalink(e.target.value)}
          disabled={busy}
        />
        <Button type="button" variant="primary" size="sm" disabled={busy} onClick={() => void handleAddEmbed()}>
          Añadir a la página de inicio
        </Button>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-dark-900 mb-3">Videos publicados ({rows.length})</h4>
        {embedsQuery.isLoading && (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        )}
        {embedsQuery.isError && (
          <Alert type="error" message="No se pudo cargar la lista. Verifica la migración en Supabase." />
        )}
        {!embedsQuery.isLoading && !embedsQuery.isError && rows.length === 0 && (
          <p className="text-sm text-dark-500 py-2">Aún no hay videos en la home.</p>
        )}
        {!embedsQuery.isLoading && rows.length > 0 && (
          <ul className="space-y-3">
            {rows.map((row, index) => (
              <li key={row.id} className="rounded-lg border border-dark-200 bg-white p-4 space-y-3">
                {editingId === row.id ? (
                  <EmbedRowEditor
                    key={row.id}
                    row={row}
                    busy={busy}
                    onCancel={() => setEditingId(null)}
                    onSave={(title, permalink) => void handleSaveEdit(row.id, title, permalink)}
                  />
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-dark-900">{row.title?.trim() || 'Sin título'}</p>
                      <p className="text-xs text-dark-500 break-all mt-1">{row.permalink}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        disabled={busy || index === 0}
                        aria-label="Subir en la lista"
                        onClick={() => void handleMove(row.id, 'up')}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        disabled={busy || index === rows.length - 1}
                        aria-label="Bajar en la lista"
                        onClick={() => void handleMove(row.id, 'down')}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setEditingId(row.id)}>
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-700 border-red-200"
                        disabled={busy}
                        aria-label="Quitar de la página de inicio"
                        onClick={() => void handleDelete(row.id)}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
