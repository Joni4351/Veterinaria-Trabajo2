import React, { useEffect, useRef, useState } from 'react';
import { ScanFace, Search, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ConfirmModal } from '../components/ConfirmModal';
import { registroFacialService as service } from '../services/registroFacialService';
import { analyzePhoto, validatePhoto } from '../services/faceDetectionService';
import './RegistroFacialView.css';

export const RegistroFacialView = () => (
  <ProtectedRoute allowedRoles={['Administrador']}><RegistroFacialPanel /></ProtectedRoute>
);

function RegistroFacialPanel() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState('');
  const [descriptor, setDescriptor] = useState(null);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState(null);
  const [action, setAction] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const imageRef = useRef(null);
  const uploadRef = useRef(null);
  const generation = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      service.usuarios(search, page, controller.signal).then(data => {
        if (controller.signal.aborted) return;
        setUsers(data.usuarios); setTotal(data.total);
      }).catch(() => {
        if (!controller.signal.aborted) {
          setUsers([]); setTotal(0);
          setMessage({ error: true, text: 'No se pudieron cargar los usuarios. Vuelva a intentar.' });
        }
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, page, refresh]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setDetailLoading(true);
    service.consultar(selected.id, controller.signal).then(data => {
      if (!controller.signal.aborted) setRecord(data);
    }).catch(() => {
      if (!controller.signal.aborted) {
        setSelected(null);
        setMessage({ error: true, text: 'No se pudo consultar el registro. Seleccione nuevamente al usuario.' });
      }
    }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selected]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { generation.current++; }, []);

  function clearPhoto() {
    generation.current++;
    setPreview(''); setDescriptor(null); setAnalyzing(false);
    if (uploadRef.current) uploadRef.current.value = '';
  }

  function choose(user) {
    clearPhoto(); setConsent(false); setMessage(null); setAction(null);
    setRecord(null); setDetailLoading(true); setSelected({ ...user });
  }

  function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    clearPhoto(); setMessage(null);
    try { validatePhoto(file); setPreview(URL.createObjectURL(file)); }
    catch (error) { setMessage({ error: true, text: error.message }); }
  }

  async function analyze() {
    const current = ++generation.current;
    setDescriptor(null); setAnalyzing(true); setMessage(null);
    try {
      const values = await analyzePhoto(imageRef.current);
      if (current !== generation.current) return;
      setDescriptor(values);
      setMessage({ text: 'Rostro detectado correctamente. Puede confirmar el registro.' });
    } catch (error) {
      if (current === generation.current) setMessage({ error: true, text: error.message || 'No se pudo analizar la imagen. Pruebe otra fotografía.' });
    } finally { if (current === generation.current) setAnalyzing(false); }
  }

  async function confirm() {
    if (!selected || (action === 'save' && (!consent || !descriptor))) return;
    setBusy(true); setMessage(null);
    try {
      if (action === 'delete') {
        await service.eliminar(selected.id); setRecord(null);
        setMessage({ text: 'Registro facial eliminado. La cuenta del usuario se conserva.' });
      } else {
        setRecord(await service.guardar(selected.id, descriptor, record));
        setMessage({ text: record ? 'Registro facial actualizado correctamente.' : 'Registro facial guardado correctamente.' });
      }
      clearPhoto(); setConsent(false); setRefresh(v => v + 1);
    } catch (error) {
      setMessage({ error: true, text: error.response?.data?.message || error.response?.data?.detail || 'No se pudo completar la operación. Intente nuevamente.' });
      if (error.response?.status === 409) {
        setDescriptor(null);
        setSelected(previous => ({ ...previous }));
        setRefresh(v => v + 1);
      }
    } finally { setBusy(false); setAction(null); }
  }

  const date = value => value ? new Date(value).toLocaleString('es-CL') : 'Sin modificaciones';
  return (
    <section className="facial-module" aria-labelledby="facial-title">
      <div className="facial-heading">
        <ScanFace size={28} aria-hidden="true" />
        <div><h2 id="facial-title">Registro Facial</h2></div>
      </div>
      {message && <div className={`facial-notice ${message.error ? 'facial-error' : ''}`} role={message.error ? 'alert' : 'status'}>{message.text}</div>}
      <div className="facial-layout">
        <aside className="facial-users" aria-label="Usuarios del sistema">
          <label className="form-label" htmlFor="facial-search"><Search size={16} aria-hidden="true" /> Buscar usuario</label>
          <input id="facial-search" className="form-input" placeholder="Nombre completo o correo" value={search}
            disabled={busy} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          <div className="facial-user-list" aria-busy={loading}>
            {loading ? <p role="status">Cargando usuarios…</p> : users.length === 0 ? <p>No se encontraron usuarios.</p> : users.map(user => (
              <button type="button" key={user.id} className={`facial-user ${selected?.id === user.id ? 'selected' : ''}`}
                aria-pressed={selected?.id === user.id} disabled={busy} onClick={() => choose(user)}>
                <strong>{user.nombreCompleto}</strong><span>{user.email}</span>
                <span className="facial-user-status">{user.registroFacial ? (user.registroFacial.activo ? 'Rostro registrado' : 'Registro inactivo') : 'Sin registro facial'}</span>
              </button>
            ))}
          </div>
          <div className="facial-actions">
            <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1 || loading || busy} onClick={() => setPage(v => v - 1)}>Anterior</button>
            <span>Página {page} · {total} usuarios</span>
            <button type="button" className="btn btn-secondary btn-sm" disabled={page * 25 >= total || loading || busy} onClick={() => setPage(v => v + 1)}>Siguiente</button>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" disabled={loading || busy} onClick={() => setRefresh(v => v + 1)}>Actualizar listado</button>
        </aside>
        <div className="facial-detail">
          {!selected ? <div className="facial-placeholder"><ShieldCheck size={42} aria-hidden="true" /><h3>Seleccione un usuario</h3><p>Busque una cuenta para consultar o registrar sus datos faciales.</p></div>
            : detailLoading ? <p role="status">Consultando registro facial…</p> : <>
              <h3>{selected.nombreCompleto}</h3><p>{selected.email} · {selected.rol}</p>
              <dl className="facial-metadata"><div><dt>Estado</dt><dd>{record ? (record.activo ? 'Registrado · Activo' : 'Registrado · Inactivo') : 'Sin registro facial'}</dd></div>
                {record && <><div><dt>Fecha de registro</dt><dd>{date(record.fechaRegistro)}</dd></div><div><dt>Última actualización</dt><dd>{date(record.fechaActualizacion)}</dd></div></>}
              </dl>
              <div className="facial-consent">
                <label><input type="checkbox" checked={consent} disabled={busy || analyzing} onChange={e => {
                  setConsent(e.target.checked); if (!e.target.checked) clearPhoto();
                }} /> Confirmo que {selected.nombreCompleto} ha sido informado y ha otorgado su consentimiento para generar y almacenar su descriptor facial cifrado, con el fin de preparar una futura función de reconocimiento facial. Puede solicitar su eliminación. La fotografía no se almacenará.</label>
                <small>El administrador deja constancia del consentimiento del titular. Se registran la fecha, el administrador responsable y la versión del texto.</small>
              </div>
              <label className="form-label" htmlFor="facial-photo"><Upload size={16} aria-hidden="true" /> {record ? 'Nueva fotografía para reemplazar el rostro' : 'Fotografía del usuario'}</label>
              <input ref={uploadRef} id="facial-photo" type="file" accept="image/jpeg,image/png" disabled={!consent || busy || analyzing} onChange={upload} aria-describedby="facial-photo-help" />
              <p id="facial-photo-help" className="facial-help">JPG o PNG · Hasta 5 MB y 20 megapíxeles. Un solo rostro, frontal, cercano y bien iluminado.</p>
              {preview && <div className="facial-preview"><img ref={imageRef} src={preview} alt="Vista previa de la fotografía seleccionada" onError={() => { clearPhoto(); setMessage({ error: true, text: 'La imagen no se pudo leer. Seleccione otro archivo JPG o PNG.' }); }} /></div>}
              <div className="facial-actions">
                <button type="button" className="btn btn-secondary" disabled={!preview || !consent || busy || analyzing} onClick={analyze}>{analyzing ? 'Cargando modelos y analizando…' : 'Analizar fotografía'}</button>
                <button type="button" className="btn btn-primary" disabled={!descriptor || !consent || busy || analyzing} onClick={() => setAction('save')}>{record ? 'Reemplazar registro facial' : 'Confirmar registro facial'}</button>
                {record && <button type="button" className="btn btn-danger" disabled={busy || analyzing} onClick={() => setAction('delete')}><Trash2 size={16} aria-hidden="true" /> Eliminar registro facial</button>}
              </div>
              {analyzing && <p role="status">Analizando la fotografía. La primera carga de los modelos puede tardar unos segundos.</p>}
            </>}
        </div>
      </div>
      <ConfirmModal isOpen={!!action} title={action === 'delete' ? 'Eliminar registro facial' : record ? 'Reemplazar registro facial' : 'Registrar rostro'}
        message={action === 'delete' ? `Se eliminarán los datos faciales de ${selected?.nombreCompleto}. Su cuenta no se eliminará.` : `¿Confirma ${record ? 'reemplazar' : 'registrar'} los datos faciales de ${selected?.nombreCompleto} con su consentimiento?`}
        confirmText={action === 'delete' ? 'Eliminar datos faciales' : 'Confirmar'} danger={action === 'delete'} loading={busy}
        onConfirm={confirm} onCancel={() => { if (!busy) setAction(null); }} />
    </section>
  );
}
