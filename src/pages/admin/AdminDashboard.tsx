import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Users,
  FileText,
  Vote,
  Music,
  Package,
  Mail,
  CalendarDays,
  UserCheck,
  UserPlus,
  Wallet,
  BadgeCheck,
} from 'lucide-react';
import { Button, Input, TextArea, Alert, Spinner } from '../../components/atoms';
import { GalleryAdminPanel, PendingMembersPanel, HomeInstagramEmbedsAdminPanel } from '../../components/molecules';
import { useAdminDashboardStats } from '../../hooks';
import { supabase } from '../../services/supabaseClient';
import { formatCopFromCents } from '../../services/adminDashboardStatsClient';

function AdminStatTile({
  icon: Icon,
  label,
  value,
  hint,
}: Readonly<{
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
}>) {
  return (
    <div className="rounded-lg border border-dark-200 bg-white p-4 shadow-sm">
      <Icon className="h-8 w-8 text-primary-400 mb-2" aria-hidden />
      <p className="text-xs font-semibold uppercase tracking-wide text-dark-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-dark-900 tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-dark-500">{hint}</p> : null}
    </div>
  );
}

export const AdminDashboard: React.FC = () => {
  const statsQuery = useAdminDashboardStats();
  const [recipientsRaw, setRecipientsRaw] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [sending, setSending] = useState(false);
  const [mailMsg, setMailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sendBroadcast = async () => {
    setMailMsg(null);
    const recipients = recipientsRaw
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      setMailMsg({ type: 'error', text: 'Agrega al menos un correo.' });
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setMailMsg({ type: 'error', text: 'Sesión no válida.' });
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/email/send-broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ recipients, subject, html: htmlBody }),
      });
      const data = (await res.json()) as { sent?: number; failed?: number; error?: string };
      if (!res.ok) {
        setMailMsg({ type: 'error', text: data.error || 'No se pudo enviar.' });
        return;
      }
      setMailMsg({
        type: 'success',
        text: `Enviados: ${data.sent ?? 0}. Fallidos: ${data.failed ?? 0}.`,
      });
    } catch {
      setMailMsg({ type: 'error', text: 'Error de red.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg border border-dark-200 p-6">
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Panel de administración</h1>
        <p className="text-dark-600">Gestión de recursos e integrantes</p>
      </div>

      <PendingMembersPanel />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-dark-200 p-6 hover:shadow-lg transition-shadow">
          <Users className="w-10 h-10 text-primary-400 mb-3" />
          <h3 className="font-semibold text-dark-900 mb-2">Integrantes</h3>
          <p className="text-sm text-dark-600 mb-4">Aprobar, gestionar roles y datos</p>
          <a
            href="#integrantes-pendientes"
            className="text-primary-400 hover:text-primary-500 text-sm font-medium inline-block"
          >
            Ver solicitudes pendientes →
          </a>
        </div>

        <div className="bg-white rounded-lg border border-dark-200 p-6 hover:shadow-lg transition-shadow">
          <Music className="w-10 h-10 text-primary-400 mb-3" />
          <h3 className="font-semibold text-dark-900 mb-2">Cantos</h3>
          <p className="text-sm text-dark-600 mb-4">Subir y aprobar cantos</p>
          <Link
            to="/admin/chants"
            className="text-primary-400 hover:text-primary-500 text-sm font-medium inline-block"
          >
            Gestionar cantos →
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-dark-200 p-6 hover:shadow-lg transition-shadow">
          <Vote className="w-10 h-10 text-primary-400 mb-3" />
          <h3 className="font-semibold text-dark-900 mb-2">Votaciones</h3>
          <p className="text-sm text-dark-600 mb-4">Crear y administrar votaciones</p>
          <Link
            to="/admin/voting"
            className="text-primary-400 hover:text-primary-500 text-sm font-medium inline-block"
          >
            Gestionar votaciones →
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-dark-200 p-6 hover:shadow-lg transition-shadow">
          <FileText className="w-10 h-10 text-primary-400 mb-3" />
          <h3 className="font-semibold text-dark-900 mb-2">Documentos</h3>
          <p className="text-sm text-dark-600 mb-4">Subir documentos oficiales</p>
          <Link
            to="/admin/documents"
            className="text-primary-400 hover:text-primary-500 text-sm font-medium inline-block"
          >
            Gestionar documentos →
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-dark-200 p-6 hover:shadow-lg transition-shadow">
          <Package className="w-10 h-10 text-primary-400 mb-3" />
          <h3 className="font-semibold text-dark-900 mb-2">Inventario</h3>
          <p className="text-sm text-dark-600 mb-4">Banderas, instrumentos y equipo</p>
          <Link
            to="/admin/inventory"
            className="text-primary-400 hover:text-primary-500 text-sm font-medium inline-block"
          >
            Gestionar inventario →
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-dark-200 p-6 hover:shadow-lg transition-shadow">
          <CalendarDays className="w-10 h-10 text-primary-400 mb-3" />
          <h3 className="font-semibold text-dark-900 mb-2">Calendario</h3>
          <p className="text-sm text-dark-600 mb-4">Crear y administrar eventos públicos y privados</p>
          <Link
            to="/admin/calendar"
            className="text-primary-400 hover:text-primary-500 text-sm font-medium inline-block"
          >
            Gestionar calendario →
          </Link>
        </div>
      </div>

      <GalleryAdminPanel />

      <div className="bg-white rounded-lg border border-dark-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="w-6 h-6 text-primary-400" />
          <h3 className="font-semibold text-dark-900">Correo publicitario (SMTP)</h3>
        </div>
        <p className="text-sm text-dark-600">Solo coordinadores.</p>
        {mailMsg && <Alert type={mailMsg.type} message={mailMsg.text} />}
        <TextArea
          label="Destinatarios (separados por coma o salto de línea)"
          rows={3}
          value={recipientsRaw}
          onChange={(e) => setRecipientsRaw(e.target.value)}
          disabled={sending}
        />
        <Input
          label="Asunto"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={sending}
        />
        <TextArea
          label="Cuerpo (HTML)"
          rows={8}
          value={htmlBody}
          onChange={(e) => setHtmlBody(e.target.value)}
          disabled={sending}
        />
        <Button type="button" variant="primary" onClick={sendBroadcast} disabled={sending}>
          {sending ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" /> Enviando…
            </span>
          ) : (
            'Enviar correo'
          )}
        </Button>
      </div>

      <HomeInstagramEmbedsAdminPanel />

      <div className="bg-white rounded-lg border border-dark-200 p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-dark-900">Resumen</h3>
          <p className="text-sm text-dark-600 mt-1">
            Indicadores consolidados del sistema. Los datos se actualizan al cargar la página (caché breve de un
            minuto).
          </p>
          {statsQuery.data?.generatedAt && (
            <p className="text-xs text-dark-500 mt-1">
              Última lectura: {new Date(statsQuery.data.generatedAt).toLocaleString('es-CO')}
            </p>
          )}
        </div>

        {statsQuery.isLoading && (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        )}

        {statsQuery.isError && (
          <Alert
            type="error"
            message={
              statsQuery.error instanceof Error
                ? statsQuery.error.message
                : 'No se pudieron cargar las estadísticas.'
            }
          />
        )}

        {statsQuery.data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <AdminStatTile
              icon={Users}
              label="Integrantes (total)"
              value={statsQuery.data.members.count}
              hint="Registros en el directorio"
            />
            <AdminStatTile
              icon={UserCheck}
              label="Cuentas activas"
              value={statsQuery.data.members.activeCount}
              hint="Pueden usar el área privada"
            />
            <AdminStatTile
              icon={UserPlus}
              label="Pendientes de aprobación"
              value={statsQuery.data.members.pendingCount}
              hint="Revisar en solicitudes arriba"
            />
            <AdminStatTile
              icon={BadgeCheck}
              label="Aportes exitosos"
              value={statsQuery.data.contributions.succeededCount}
              hint="Transparencia / donaciones confirmadas"
            />
            <AdminStatTile
              icon={Wallet}
              label="Total aportado (COP)"
              value={formatCopFromCents(statsQuery.data.contributions.totalAmountCop)}
              hint="Suma de aportes con estado exitoso"
            />
          </div>
        )}
      </div>
    </div>
  );
};
