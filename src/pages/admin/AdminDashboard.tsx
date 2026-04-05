import React, { useState } from 'react';
import { Users, FileText, Vote, Music, Package, Mail } from 'lucide-react';
import { Button, Input, TextArea, Alert, Spinner } from '../../components/atoms';
import { GalleryAdminPanel, PendingMembersPanel } from '../../components/molecules';
import { supabase } from '../../services/supabaseClient';

export const AdminDashboard: React.FC = () => {
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
      <div>
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
          <button type="button" className="text-primary-400 hover:text-primary-500 text-sm font-medium">
            Gestionar cantos →
          </button>
        </div>

        <div className="bg-white rounded-lg border border-dark-200 p-6 hover:shadow-lg transition-shadow">
          <Vote className="w-10 h-10 text-primary-400 mb-3" />
          <h3 className="font-semibold text-dark-900 mb-2">Votaciones</h3>
          <p className="text-sm text-dark-600 mb-4">Crear y administrar votaciones</p>
          <button type="button" className="text-primary-400 hover:text-primary-500 text-sm font-medium">
            Gestionar votaciones →
          </button>
        </div>

        <div className="bg-white rounded-lg border border-dark-200 p-6 hover:shadow-lg transition-shadow">
          <FileText className="w-10 h-10 text-primary-400 mb-3" />
          <h3 className="font-semibold text-dark-900 mb-2">Documentos</h3>
          <p className="text-sm text-dark-600 mb-4">Subir documentos oficiales</p>
          <button type="button" className="text-primary-400 hover:text-primary-500 text-sm font-medium">
            Gestionar documentos →
          </button>
        </div>

        <div className="bg-white rounded-lg border border-dark-200 p-6 hover:shadow-lg transition-shadow">
          <Package className="w-10 h-10 text-primary-400 mb-3" />
          <h3 className="font-semibold text-dark-900 mb-2">Inventario</h3>
          <p className="text-sm text-dark-600 mb-4">Banderas, instrumentos y equipo</p>
          <button type="button" className="text-primary-400 hover:text-primary-500 text-sm font-medium">
            Gestionar inventario →
          </button>
        </div>
      </div>

      <GalleryAdminPanel />

      <div className="bg-white rounded-lg border border-dark-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="w-6 h-6 text-primary-400" />
          <h3 className="font-semibold text-dark-900">Correo publicitario (SMTP)</h3>
        </div>
        <p className="text-sm text-dark-600">
          Solo coordinadores. Configura Gmail con contraseña de aplicación en el servidor (variables SMTP_*).
          Máximo 80 destinatarios por envío.
        </p>
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

      <div className="bg-primary-50 rounded-lg border border-primary-200 p-6">
        <h3 className="font-semibold text-dark-900 mb-2">Resumen</h3>
        <p className="text-dark-600 text-sm">Estadísticas del panel próximamente.</p>
      </div>
    </div>
  );
};
