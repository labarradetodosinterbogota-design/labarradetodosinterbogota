import React, { useMemo, useRef, useState } from 'react';
import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Input, Select, Spinner, TextArea } from '../../components/atoms';
import { useAllVoting, useCreatePoll } from '../../hooks';
import { useAuth } from '../../context/AuthContext';
import { votingService } from '../../services/votingService';
import { votingOptionMediaService } from '../../services/votingOptionMediaService';
import { VoteOption, VotingStatus } from '../../types';

function getStatusVariant(status: VotingStatus): 'secondary' | 'success' | 'info' {
  if (status === VotingStatus.ACTIVE) return 'success';
  if (status === VotingStatus.CLOSED) return 'secondary';
  return 'info';
}

const DEFAULT_END_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
const MIN_MULTIPLE_OPTIONS = 2;
const MAX_MULTIPLE_OPTIONS = 8;

type PollType = 'yes_no' | 'multiple_choice';

interface PollOptionDraft {
  key: string;
  label: string;
  imageUrl: string;
}

const POLL_TYPE_OPTIONS: Array<{ value: PollType; label: string }> = [
  { value: 'yes_no', label: 'Sí / No' },
  { value: 'multiple_choice', label: 'Múltiple opción' },
];

const createDefaultOptionDrafts = (): PollOptionDraft[] => [
  { key: 'option-1', label: '', imageUrl: '' },
  { key: 'option-2', label: '', imageUrl: '' },
];

const createYesNoOptions = (): VoteOption[] => [
  { id: 'yes', label: 'Sí', image_url: null, vote_count: 0, percentage: 0 },
  { id: 'no', label: 'No', image_url: null, vote_count: 0, percentage: 0 },
];

function isValidHttpUrl(rawUrl: string): boolean {
  try {
    const parsedUrl = new URL(rawUrl);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

function buildOptionId(rawLabel: string, index: number, usedIds: Set<string>): string {
  const normalized = rawLabel
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const base = normalized.length > 0 ? normalized : `opcion-${index + 1}`;
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function buildMultipleChoiceOptions(drafts: PollOptionDraft[]): VoteOption[] {
  const usedIds = new Set<string>();
  return drafts.map((option, index) => ({
    id: buildOptionId(option.label, index, usedIds),
    label: option.label.trim(),
    image_url: option.imageUrl.trim() || null,
    vote_count: 0,
    percentage: 0,
  }));
}

function getPollTypeLabel(type: PollType): string {
  return type === 'yes_no' ? 'Sí / No' : 'Múltiple opción';
}

type BasePollValidationResult =
  | {
      isValid: true;
      sanitizedTitle: string;
      parsedEndDate: Date;
      parsedQuorum: number;
    }
  | {
      isValid: false;
      error: string;
    };

function validateBasePollFields(
  title: string,
  endAt: string,
  quorumRequired: string
): BasePollValidationResult {
  const sanitizedTitle = title.trim();
  if (!sanitizedTitle) {
    return { isValid: false, error: 'El título es obligatorio.' };
  }

  const parsedEndDate = new Date(endAt);
  if (Number.isNaN(parsedEndDate.getTime())) {
    return { isValid: false, error: 'La fecha de cierre no es válida.' };
  }
  if (parsedEndDate <= new Date()) {
    return { isValid: false, error: 'La fecha de cierre debe ser futura.' };
  }

  const parsedQuorum = Number.parseInt(quorumRequired, 10);
  if (!Number.isInteger(parsedQuorum) || parsedQuorum < 1 || parsedQuorum > 100) {
    return { isValid: false, error: 'El quórum debe estar entre 1 y 100.' };
  }

  return { isValid: true, sanitizedTitle, parsedEndDate, parsedQuorum };
}

type PollOptionsValidationResult =
  | {
      isValid: true;
      options: VoteOption[];
    }
  | {
      isValid: false;
      error: string;
    };

function validatePollOptions(
  pollType: PollType,
  optionDrafts: PollOptionDraft[]
): PollOptionsValidationResult {
  if (pollType === 'yes_no') {
    return { isValid: true, options: createYesNoOptions() };
  }

  const normalizedDrafts = optionDrafts.map((option) => ({
    ...option,
    label: option.label.trim(),
    imageUrl: option.imageUrl.trim(),
  }));

  if (normalizedDrafts.length < MIN_MULTIPLE_OPTIONS) {
    return {
      isValid: false,
      error: `Debes configurar al menos ${MIN_MULTIPLE_OPTIONS} opciones para una votación múltiple.`,
    };
  }

  if (normalizedDrafts.some((option) => option.label.length === 0)) {
    return { isValid: false, error: 'Cada opción debe tener un nombre.' };
  }

  const normalizedLabels = normalizedDrafts.map((option) => option.label.toLowerCase());
  if (new Set(normalizedLabels).size !== normalizedLabels.length) {
    return { isValid: false, error: 'No puede haber opciones repetidas.' };
  }

  const invalidImageUrl = normalizedDrafts.find(
    (option) => option.imageUrl.length > 0 && !isValidHttpUrl(option.imageUrl)
  );
  if (invalidImageUrl) {
    return {
      isValid: false,
      error: `La URL de imagen para "${invalidImageUrl.label}" no es válida.`,
    };
  }

  return { isValid: true, options: buildMultipleChoiceOptions(normalizedDrafts) };
}

export const AdminVoting: React.FC = () => {
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pollType, setPollType] = useState<PollType>('yes_no');
  const [optionDrafts, setOptionDrafts] = useState<PollOptionDraft[]>(() => createDefaultOptionDrafts());
  const [uploadingOptionKey, setUploadingOptionKey] = useState<string | null>(null);
  const [endAt, setEndAt] = useState(DEFAULT_END_DATE);
  const [quorumRequired, setQuorumRequired] = useState('50');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const optionSequenceRef = useRef(optionDrafts.length);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAllVoting(page, 12);
  const createPollMutation = useCreatePoll();
  const closePollMutation = useMutation({
    mutationFn: (pollId: string) => votingService.closePoll(pollId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['all-polls'] });
      void queryClient.invalidateQueries({ queryKey: ['active-polls'] });
    },
  });
  const deletePollMutation = useMutation({
    mutationFn: (pollId: string) => votingService.deletePoll(pollId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['all-polls'] });
      void queryClient.invalidateQueries({ queryKey: ['active-polls'] });
      void queryClient.invalidateQueries({ queryKey: ['poll'] });
    },
  });

  const activeCount = useMemo(
    () => (data?.data ?? []).filter((poll) => poll.status === VotingStatus.ACTIVE).length,
    [data?.data]
  );
  const hasPolls = (data?.data?.length ?? 0) > 0;
  let pollsContent: React.ReactNode;

  if (isLoading) {
    pollsContent = (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  } else if (hasPolls) {
    pollsContent = (
      <div className="bg-white rounded-lg border border-dark-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-dark-50 text-left text-dark-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Título</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Votos</th>
              <th className="px-4 py-3 font-semibold">Cierra</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data?.data?.map((poll) => (
              <tr key={poll.id} className="border-t border-dark-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-dark-900">{poll.title}</p>
                  {poll.description && <p className="text-dark-500">{poll.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="info" size="sm">
                      {getPollTypeLabel(poll.type)}
                    </Badge>
                    <span className="text-xs text-dark-500">{poll.options.length} opciones</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={getStatusVariant(poll.status)}>{poll.status}</Badge>
                </td>
                <td className="px-4 py-3 text-dark-700">{poll.total_votes}</td>
                <td className="px-4 py-3 text-dark-700">{new Date(poll.end_date).toLocaleString('es-CO')}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={
                        poll.status !== VotingStatus.ACTIVE ||
                        deletePollMutation.isPending ||
                        closePollMutation.isPending
                      }
                      isLoading={closePollMutation.isPending}
                      onClick={() => {
                        void handleClosePoll(poll.id);
                      }}
                    >
                      Cerrar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      disabled={deletePollMutation.isPending || closePollMutation.isPending}
                      isLoading={deletePollMutation.isPending}
                      onClick={() => {
                        void handleDeletePoll(poll.id, poll.title);
                      }}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
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
    pollsContent = (
      <div className="bg-white rounded-lg border border-dark-200 p-8 text-center text-dark-600">
        No hay votaciones registradas.
      </div>
    );
  }

  const addOptionDraft = () => {
    if (optionDrafts.length >= MAX_MULTIPLE_OPTIONS) return;
    optionSequenceRef.current += 1;
    setOptionDrafts((prev) => [
      ...prev,
      { key: `option-${optionSequenceRef.current}`, label: '', imageUrl: '' },
    ]);
  };

  const removeOptionDraft = (key: string) => {
    setOptionDrafts((prev) => {
      if (prev.length <= MIN_MULTIPLE_OPTIONS) return prev;
      return prev.filter((option) => option.key !== key);
    });
  };

  const updateOptionDraft = (
    key: string,
    field: 'label' | 'imageUrl',
    value: string
  ) => {
    setOptionDrafts((prev) =>
      prev.map((option) => (option.key === key ? { ...option, [field]: value } : option))
    );
  };

  const clearOptionImage = (key: string) => {
    updateOptionDraft(key, 'imageUrl', '');
  };

  const handleOptionImageUpload = async (optionKey: string, file: File) => {
    if (!user) {
      setMessage({ type: 'error', text: 'No hay sesión activa para subir imágenes de opciones.' });
      return;
    }

    setMessage(null);
    setUploadingOptionKey(optionKey);
    try {
      const uploaded = await votingOptionMediaService.uploadOptionImage(file, user.id);
      updateOptionDraft(optionKey, 'imageUrl', uploaded.publicUrl);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo subir la imagen de opción.',
      });
    } finally {
      setUploadingOptionKey(null);
    }
  };

  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setPollType('yes_no');
    const defaults = createDefaultOptionDrafts();
    setOptionDrafts(defaults);
    optionSequenceRef.current = defaults.length;
    setUploadingOptionKey(null);
    setEndAt(DEFAULT_END_DATE);
    setQuorumRequired('50');
  };

  const handleCreatePoll = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!user) {
      setMessage({ type: 'error', text: 'No hay sesión activa para crear la votación.' });
      return;
    }
    if (uploadingOptionKey !== null) {
      setMessage({ type: 'error', text: 'Espera a que finalice la subida de imágenes antes de crear la votación.' });
      return;
    }

    const baseValidation = validateBasePollFields(title, endAt, quorumRequired);
    if (!baseValidation.isValid) {
      setMessage({ type: 'error', text: baseValidation.error });
      return;
    }

    const optionsValidation = validatePollOptions(pollType, optionDrafts);
    if (!optionsValidation.isValid) {
      setMessage({ type: 'error', text: optionsValidation.error });
      return;
    }

    try {
      await createPollMutation.mutateAsync({
        userId: user.id,
        poll: {
          title: baseValidation.sanitizedTitle,
          description: description.trim() || null,
          type: pollType,
          options: optionsValidation.options,
          start_date: new Date().toISOString(),
          end_date: baseValidation.parsedEndDate.toISOString(),
          quorum_required: baseValidation.parsedQuorum,
          status: VotingStatus.ACTIVE,
          created_by: user.id,
        },
      });
      resetCreateForm();
      setMessage({ type: 'success', text: 'Votación creada correctamente.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo crear la votación.',
      });
    }
  };

  const handleClosePoll = async (pollId: string) => {
    setMessage(null);
    try {
      await closePollMutation.mutateAsync(pollId);
      setMessage({ type: 'success', text: 'Votación cerrada correctamente.' });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo cerrar la votación.' });
    }
  };

  const handleDeletePoll = async (pollId: string, pollTitle: string) => {
    const confirmed = globalThis.window.confirm(
      `Vas a eliminar la votación "${pollTitle}". Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setMessage(null);
    try {
      await deletePollMutation.mutateAsync(pollId);
      setMessage({ type: 'success', text: 'Votación eliminada. Las imágenes huérfanas se limpiaron automáticamente.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo eliminar la votación.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-dark-200 p-6">
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Gestión de votaciones</h1>
        <p className="text-dark-600">
          Crea nuevas votaciones y controla su estado para mantener decisiones transparentes.
        </p>
      </div>

      {message && <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />}

      <div className="bg-white rounded-lg border border-dark-200 p-4 flex flex-wrap items-center gap-3">
        <Badge variant="success">Activas en esta página: {activeCount}</Badge>
        <span className="text-sm text-dark-500">Total listadas: {data?.data?.length ?? 0}</span>
      </div>

      <form onSubmit={handleCreatePoll} className="bg-white rounded-lg border border-dark-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-dark-900">Crear votación</h2>
        <Input
          label="Título"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          placeholder="Ej: Aprobación de nuevo diseño de bandera"
        />
        <TextArea
          label="Descripción"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Contexto para que los integrantes voten informados"
        />
        <Select
          label="Tipo de votación"
          value={pollType}
          onChange={(event) => setPollType(event.target.value as PollType)}
          options={POLL_TYPE_OPTIONS}
        />

        {pollType === 'yes_no' ? (
          <div className="rounded-lg border border-dark-200 bg-dark-50 px-4 py-3 text-sm text-dark-700">
            Esta votación se crea con opciones fijas:
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="info" size="sm">
                Sí
              </Badge>
              <Badge variant="secondary" size="sm">
                No
              </Badge>
            </div>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border border-dark-200 bg-dark-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-dark-700">
                Configura entre {MIN_MULTIPLE_OPTIONS} y {MAX_MULTIPLE_OPTIONS} opciones.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOptionDraft}
                disabled={
                  optionDrafts.length >= MAX_MULTIPLE_OPTIONS ||
                  createPollMutation.isPending ||
                  uploadingOptionKey !== null
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Agregar opción
              </Button>
            </div>

            <div className="space-y-3">
              {optionDrafts.map((option, index) => {
                const normalizedImageUrl = option.imageUrl.trim();
                const hasValidPreview =
                  normalizedImageUrl.length > 0 && isValidHttpUrl(normalizedImageUrl);
                const previewLabel = option.label.trim() || `opción ${index + 1}`;
                const isUploadingThisOption = uploadingOptionKey === option.key;
                const fileInputId = `voting-option-image-${option.key}`;
                return (
                  <div
                    key={option.key}
                    className="grid grid-cols-1 gap-3 rounded-lg border border-dark-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                  >
                    <Input
                      label={`Opción ${index + 1}`}
                      value={option.label}
                      onChange={(event) => updateOptionDraft(option.key, 'label', event.target.value)}
                      placeholder={`Ej: Propuesta ${index + 1}`}
                      disabled={createPollMutation.isPending || uploadingOptionKey !== null}
                      required={pollType === 'multiple_choice'}
                    />
                    <div className="space-y-2">
                      <Input
                        label="URL de imagen (opcional)"
                        type="url"
                        value={option.imageUrl}
                        onChange={(event) => updateOptionDraft(option.key, 'imageUrl', event.target.value)}
                        placeholder="https://..."
                        disabled={createPollMutation.isPending || uploadingOptionKey !== null}
                        error={
                          normalizedImageUrl.length > 0 && !isValidHttpUrl(normalizedImageUrl)
                            ? 'URL inválida. Usa http(s).'
                            : undefined
                        }
                      />
                      <div>
                        <label htmlFor={fileInputId} className="mb-1.5 block text-sm font-medium text-dark-900">
                          Archivo de imagen (opcional)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            id={fileInputId}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="w-full cursor-pointer rounded-lg border border-dark-200 bg-white px-3 py-2 text-sm text-dark-700"
                            disabled={createPollMutation.isPending || uploadingOptionKey !== null}
                            onChange={(event) => {
                              const selected = event.target.files?.[0];
                              event.target.value = '';
                              if (!selected) return;
                              void handleOptionImageUpload(option.key, selected);
                            }}
                          />
                          <span
                            className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${
                              isUploadingThisOption
                                ? 'bg-primary-100 text-primary-700'
                                : 'bg-dark-100 text-dark-600'
                            }`}
                          >
                            <ImagePlus className="mr-1 h-3.5 w-3.5" />
                            {isUploadingThisOption ? 'Subiendo...' : 'Subir'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      {hasValidPreview ? (
                        <img
                          src={normalizedImageUrl}
                          alt={`Vista previa de ${previewLabel}`}
                          className="h-11 w-11 rounded-md border border-dark-200 object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-md border border-dashed border-dark-300 bg-dark-50" />
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => removeOptionDraft(option.key)}
                        disabled={
                          optionDrafts.length <= MIN_MULTIPLE_OPTIONS ||
                          createPollMutation.isPending ||
                          uploadingOptionKey !== null
                        }
                        aria-label={`Eliminar opción ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-dark-600"
                        onClick={() => clearOptionImage(option.key)}
                        disabled={
                          normalizedImageUrl.length === 0 ||
                          createPollMutation.isPending ||
                          uploadingOptionKey !== null
                        }
                      >
                        Quitar imagen
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Fecha de cierre"
            type="datetime-local"
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
            required
          />
          <Input
            label="Quórum requerido (%)"
            type="number"
            min={1}
            max={100}
            value={quorumRequired}
            onChange={(event) => setQuorumRequired(event.target.value)}
            required
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          isLoading={createPollMutation.isPending}
          disabled={uploadingOptionKey !== null}
        >
          Crear votación
        </Button>
      </form>

      {error && <Alert type="error" message="No se pudieron cargar las votaciones." />}
      {pollsContent}

      {(data?.total_pages ?? 0) > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Anterior
          </Button>
          <span className="px-4 py-2 text-sm text-dark-700">
            Página {page} de {data?.total_pages}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page === (data?.total_pages ?? page)}
            onClick={() => setPage((prev) => Math.min(data?.total_pages ?? prev, prev + 1))}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
};
