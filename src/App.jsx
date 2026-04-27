import {
  LayoutDashboard, Users, ClipboardList, UserCog,
  LogOut, Coffee, Sun, Moon, TrendingUp, Clock, AlertCircle, RefreshCw,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import './App.css'
import { QRCodeCanvas } from 'qrcode.react'
import html2canvas from 'html2canvas'
import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'

export default function App() {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [loading, setLoading] = useState(false)
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [dashboardData, setDashboardData] = useState({
    entradasHoy: 0,
    salidasHoy: 0,
    totalTrabajadores: 0,
    activos: 0,
    ultimosRegistros: []
  })
  const [trabajadores, setTrabajadores] = useState([])
  const [busquedaTrabajador, setBusquedaTrabajador] = useState('')
  const [loadingTrabajadores, setLoadingTrabajadores] = useState(false)
  const [showModalTrabajador, setShowModalTrabajador] = useState(false)
  const [nuevoTrabajador, setNuevoTrabajador] = useState({
    nombre_completo: '',
    dni: '',
    nivel: 'primaria'
  })
  const [fotoTrabajador, setFotoTrabajador] = useState(null)
  const [trabajadorEditando, setTrabajadorEditando] = useState(null)
  const [trabajadorQR, setTrabajadorQR] = useState(null)
  const carnetRef = useRef(null)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [registros, setRegistros] = useState([])
  const [loadingReportes, setLoadingReportes] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroTrabajador, setFiltroTrabajador] = useState('')
  const [usuarios, setUsuarios] = useState([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [showModalUsuario, setShowModalUsuario] = useState(false)

  const [nuevoUsuario, setNuevoUsuario] = useState({
    usuario: '',
    password: '',
    rol: 'portero'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const savedSession = localStorage.getItem('admin_session')
    if (savedSession) {
      try { setSession(JSON.parse(savedSession)) }
      catch { localStorage.removeItem('admin_session') }
    }
    setCheckingSession(false)
  }, [])

  useEffect(() => {
    if (session) localStorage.setItem('admin_session', JSON.stringify(session))
  }, [session])

  useEffect(() => {
    if (session) cargarDashboard()
  }, [session])

  useEffect(() => {
    if (session && activePage === 'trabajadores') cargarTrabajadores()
  }, [session, activePage])

  useEffect(() => {
    if (activePage === 'reportes') {
      cargarTrabajadores()
    }
  }, [activePage])

  useEffect(() => {
    if (activePage === 'usuarios') {
      cargarUsuarios()
    }
  }, [activePage])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!usuario || !password) { alert('Ingresa usuario y contraseña'); return }
    setLoading(true)
    try {
      const cleanUser = usuario.trim().toLowerCase()
      const cleanPass = password.trim()
      const { data } = await supabase.from('usuarios_app').select('*').eq('usuario', cleanUser).single()
      if (!data) { alert('Usuario no encontrado'); return }
      if (data.rol !== 'admin') { alert('Solo admin puede ingresar'); return }
      const { data: isValid } = await supabase.rpc('verificar_password', { p_usuario: cleanUser, p_pass: cleanPass })
      if (!isValid) { alert('Contraseña incorrecta'); return }
      setSession(data)
    } catch (err) {
      console.error(err)
      alert('Error de conexión con Supabase')
    } finally { setLoading(false) }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_session')
    setSession(null)
    setUsuario('')
    setPassword('')
    setActivePage('dashboard')
  }

  const cargarDashboard = async () => {
    try {
      const hoy = new Date()
      const inicio = new Date(hoy); inicio.setHours(0, 0, 0, 0)
      const fin = new Date(hoy); fin.setHours(23, 59, 59, 999)

      const { count: totalTrabajadores } = await supabase.from('trabajadores').select('*', { count: 'exact', head: true })
      const { count: activos } = await supabase.from('trabajadores').select('*', { count: 'exact', head: true }).eq('activo', true)
      const { count: entradasHoy } = await supabase.from('asistencia').select('*', { count: 'exact', head: true }).eq('tipo', 'entrada').gte('fecha_hora', inicio.toISOString()).lte('fecha_hora', fin.toISOString())
      const { count: salidasHoy } = await supabase.from('asistencia').select('*', { count: 'exact', head: true }).eq('tipo', 'salida').gte('fecha_hora', inicio.toISOString()).lte('fecha_hora', fin.toISOString())
      const { data: ultimosRegistros } = await supabase.from('asistencia').select(`id, fecha_hora, tipo, registrado_por, trabajadores (nombre_completo, dni, nivel)`).gte('fecha_hora', inicio.toISOString()).lte('fecha_hora', fin.toISOString()).order('fecha_hora', { ascending: false }).limit(8)

      setDashboardData({
        entradasHoy: entradasHoy || 0,
        salidasHoy: salidasHoy || 0,
        totalTrabajadores: totalTrabajadores || 0,
        activos: activos || 0,
        ultimosRegistros: ultimosRegistros || []
      })
    } catch (err) { console.error('Error cargando dashboard:', err) }
  }

  const cargarTrabajadores = async () => {
    setLoadingTrabajadores(true)
    try {
      const { data, error } = await supabase.from('trabajadores').select('*').order('nombre_completo', { ascending: true })
      if (error) throw error
      setTrabajadores(data || [])
    } catch (err) {
      console.error('Error cargando trabajadores:', err)
      alert('No se pudieron cargar los trabajadores')
    } finally { setLoadingTrabajadores(false) }
  }

  const cargarReportes = async () => {
    if (!fechaInicio || !fechaFin) {
      alert('Selecciona rango de fechas')
      return
    }

    setLoadingReportes(true)

    try {
      let query = supabase
        .from('asistencia')
        .select(`
        id,
        tipo,
        fecha_hora,
        registrado_por,
        trabajadores (
          nombre_completo,
          dni,
          nivel
        )
      `)
        .gte('fecha_hora', new Date(fechaInicio).toISOString())
        .lte('fecha_hora', new Date(fechaFin + 'T23:59:59').toISOString())
        .order('fecha_hora', { ascending: false })

      if (filtroTipo) {
        query = query.eq('tipo', filtroTipo)
      }

      if (filtroTrabajador) {
        query = query.eq('trabajadores.id', filtroTrabajador)
      }

      const { data, error } = await query

      if (error) throw error

      setRegistros(data || [])

    } catch (err) {
      console.error(err)
      alert('Error cargando reportes')
    } finally {
      setLoadingReportes(false)
    }
  }

  const cargarUsuarios = async () => {
    setLoadingUsuarios(true)

    try {
      const { data, error } = await supabase
        .from('usuarios_app')
        .select('*')
        .order('usuario', { ascending: true })

      if (error) throw error

      setUsuarios(data || [])

    } catch (err) {
      console.error(err)
      alert('Error cargando usuarios')
    } finally {
      setLoadingUsuarios(false)
    }
  }

  const exportarExcel = () => {
    if (registros.length === 0) {
      alert('No hay datos para exportar')
      return
    }

    const data = registros.map(r => {
      const fecha = new Date(r.fecha_hora)

      return {
        Nombre: r.trabajadores?.nombre_completo || '',
        DNI: r.trabajadores?.dni || '',
        Nivel: r.trabajadores?.nivel || '',
        Tipo: r.tipo,
        Fecha: fecha.toLocaleDateString('es-PE'),
        Hora: fecha.toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        'Registrado por': r.registrado_por
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reportes')

    XLSX.writeFile(workbook, 'reporte_asistencia.xlsx')
  }

  const cambiarEstadoTrabajador = async (id, estadoActual) => {
    try {
      const { error } = await supabase.from('trabajadores').update({ activo: !estadoActual }).eq('id', id)
      if (error) throw error
      await cargarTrabajadores()
      await cargarDashboard()
    } catch (err) {
      console.error('Error cambiando estado:', err)
      alert('No se pudo cambiar el estado del trabajador')
    }
  }

  const guardarTrabajador = async (e) => {
    e.preventDefault()
    if (!nuevoTrabajador.nombre_completo || !nuevoTrabajador.dni) { alert('Completa nombre y DNI'); return }
    try {
      let fotoUrl = trabajadorEditando?.foto_url || null
      if (fotoTrabajador) {
        const fileExt = fotoTrabajador.name.split('.').pop()
        const fileName = `${Date.now()}-${nuevoTrabajador.dni}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('fotos_personal').upload(fileName, fotoTrabajador, { cacheControl: '3600', upsert: true })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('fotos_personal').getPublicUrl(fileName)
        fotoUrl = urlData.publicUrl
      }
      const payload = {
        nombre_completo: nuevoTrabajador.nombre_completo.trim(),
        dni: nuevoTrabajador.dni.trim(),
        nivel: nuevoTrabajador.nivel,
        foto_url: fotoUrl,
        activo: trabajadorEditando ? trabajadorEditando.activo : true,
        creado_por: session?.usuario || 'admin_web'
      }
      let error
      if (trabajadorEditando) {
        const { error: updateError } = await supabase.from('trabajadores').update(payload).eq('id', trabajadorEditando.id)
        error = updateError
      } else {
        const { error: insertError } = await supabase.from('trabajadores').insert([payload])
        error = insertError
      }
      if (error) throw error
      setShowModalTrabajador(false)
      setNuevoTrabajador({ nombre_completo: '', dni: '', nivel: 'primaria' })
      setFotoTrabajador(null)
      setTrabajadorEditando(null)
      await cargarTrabajadores()
      await cargarDashboard()
    } catch (err) {
      console.error('Error guardando trabajador:', err)
      alert('No se pudo guardar el trabajador')
    }
  }

  const handleRefresh = () => {
    if (activePage === 'dashboard') return cargarDashboard()
    if (activePage === 'trabajadores') return cargarTrabajadores()
    if (activePage === 'reportes') return cargarReportes()
    if (activePage === 'usuarios') return cargarUsuarios()
  }

  const descargarCarnet = async () => {
    if (!carnetRef.current || !trabajadorQR) return

    const canvas = await html2canvas(carnetRef.current, {
      backgroundColor: '#ffffff',
      scale: 4,
      useCORS: true,
      allowTaint: true
    })

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `carnet-${trabajadorQR.dni}.png`
    link.click()
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trabajadores', label: 'Trabajadores', icon: Users },
    { id: 'reportes', label: 'Reportes', icon: ClipboardList },
    { id: 'usuarios', label: 'Usuarios', icon: UserCog },
  ]

  const crearUsuario = async (e) => {
    e.preventDefault()

    if (!nuevoUsuario.usuario || !nuevoUsuario.password) {
      alert('Completa los campos')
      return
    }

    try {
      const { error } = await supabase.rpc('registrar_usuario_seguro', {
        p_usuario: nuevoUsuario.usuario.trim().toLowerCase(),
        p_password: nuevoUsuario.password.trim(),
        p_rol: nuevoUsuario.rol
      })

      if (error) throw error

      setShowModalUsuario(false)
      setNuevoUsuario({
        usuario: '',
        password: '',
        rol: 'portero'
      })

      await cargarUsuarios()

    } catch (err) {
      console.error(err)
      alert('Error creando usuario')
    }
  }

  if (checkingSession) return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo"><Coffee size={20} strokeWidth={2} /></div>
        <p className="login-sub">Cargando sesión...</p>
      </div>
    </div>
  )

  if (!session) return (
    <div className="login-page">
      <div className="login-glow" />
      <div className="login-card">
        <div className="login-top">
          <div className="login-logo"><Coffee size={20} strokeWidth={2} /></div>
          <button className="theme-pill" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            {theme === 'dark' ? 'Claro' : 'Oscuro'}
          </button>
        </div>
        <h1 className="login-title">Panel Cafetería</h1>
        <p className="login-sub">Acceso administrador</p>
        <form onSubmit={handleLogin} className="login-form">
          <div className="field">
            <label>Usuario</label>
            <input placeholder="nombre de usuario" value={usuario} onChange={e => setUsuario(e.target.value)} />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="login-btn" disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? 'Validando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )

  const activeNav = navItems.find(n => n.id === activePage)
  const trabajadoresFiltrados = trabajadores.filter(t => {
    const texto = busquedaTrabajador.toLowerCase()
    return t.nombre_completo?.toLowerCase().includes(texto) || t.dni?.includes(texto) || t.nivel?.toLowerCase().includes(texto)
  })

  return (
    <div className="admin-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-icon"><Coffee size={18} strokeWidth={2} /></div>
          <div>
            <p className="brand-name">Cafetería</p>
            <p className="brand-role">Admin Panel</p>
          </div>
        </div>
        <nav className="nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item${activePage === id ? ' active' : ''}`} onClick={() => {
  setActivePage(id)
  setSidebarOpen(false)
}}>
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
              {activePage === id && <div className="nav-pip" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-row">
            <div className="user-avatar">{session?.usuario?.charAt(0)?.toUpperCase() || 'A'}</div>
            <span className="user-name">{session?.usuario || 'Administrador'}</span>
          </div>
          <button className="icon-btn danger" onClick={handleLogout} title="Cerrar sesión">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button
  className="mobile-menu-btn"
  onClick={() => setSidebarOpen(true)}
>
  ☰
</button>
          <div>
            <h1 className="topbar-title">{activeNav?.label}</h1>
            <p className="topbar-sub">Sistema de asistencia QR</p>
          </div>
          <div className="topbar-right">
            <div className="online-badge"><span className="online-dot" />En línea</div>
            <button className="theme-pill" onClick={handleRefresh}>
              <RefreshCw size={13} /> Actualizar
            </button>
            <button className="theme-pill" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
              {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            </button>
          </div>
        </header>

        <div className="page">
          {activePage === 'dashboard' && <>
            <div className="stats-grid">
              {[
                { label: 'Entradas hoy', value: dashboardData.entradasHoy, icon: TrendingUp },
                { label: 'Salidas hoy', value: dashboardData.salidasHoy, icon: Clock },
                { label: 'Trabajadores', value: dashboardData.totalTrabajadores, icon: Users },
                { label: 'Activos', value: dashboardData.activos, icon: AlertCircle },
              ].map(({ label, value, icon: Icon }) => (
                <div className="stat-card" key={label}>
                  <div className="stat-top">
                    <span className="stat-label">{label}</span>
                    <div className="stat-icon"><Icon size={14} /></div>
                  </div>
                  <p className="stat-value">{value}</p>
                </div>
              ))}
            </div>
            <div className="table-card">
              <div className="table-header">
                <span className="table-title">Últimos registros</span>
                <span className="badge">Recientes</span>
              </div>
              {dashboardData.ultimosRegistros.length === 0 ? (
                <div className="empty-rows"><p>Sin registros aún</p></div>
              ) : (
                <div className="records-list">
                  {dashboardData.ultimosRegistros.map((r) => {
                    const fecha = new Date(r.fecha_hora)
                    return (
                      <div className="record-row" key={r.id}>
                        <div>
                          <p className="record-name">{r.trabajadores?.nombre_completo || 'Sin nombre'}</p>
                          <span className="record-detail">DNI: {r.trabajadores?.dni || 'N/A'} · {r.trabajadores?.nivel || 'N/A'}</span>
                        </div>
                        <div className="record-right">
                          <span className={`badge ${r.tipo === 'entrada' ? 'entrada' : 'salida'}`}>{r.tipo}</span>
                          <span className="record-time">
                            {fecha.toLocaleDateString('es-PE')} - {fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>}

          {activePage === 'trabajadores' && (
            <div className="table-card">
              <div className="table-header">
                <div>
                  <span className="table-title">Personal registrado</span>
                  <p className="table-subtitle">Gestión de trabajadores del cafetín</p>
                </div>
                <button className="primary-action" onClick={() => setShowModalTrabajador(true)}>+ Nuevo trabajador</button>
              </div>
              <div className="table-tools">
                <input className="search-input" placeholder="Buscar por nombre, DNI o nivel..." value={busquedaTrabajador} onChange={e => setBusquedaTrabajador(e.target.value)} />
              </div>
              {loadingTrabajadores ? (
                <div className="empty-rows"><p>Cargando trabajadores...</p></div>
              ) : trabajadoresFiltrados.length === 0 ? (
                <div className="empty-rows"><p>No se encontraron trabajadores</p></div>
              ) : (
                <div className="responsive-table">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Trabajador</th><th>DNI</th><th>Nivel</th><th>Estado</th><th>Creado por</th><th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trabajadoresFiltrados.map(t => (
                        <tr key={t.id}>
                          <td>
                            <div className="worker-cell">
                              {t.foto_url ? <img src={t.foto_url} alt={t.nombre_completo} /> : <div className="worker-avatar">{t.nombre_completo?.charAt(0)?.toUpperCase() || 'T'}</div>}
                              <span>{t.nombre_completo}</span>
                            </div>
                          </td>
                          <td>{t.dni}</td>
                          <td>{t.nivel}</td>
                          <td><span className={`badge ${t.activo ? 'entrada' : 'inactivo'}`}>{t.activo ? 'Activo' : 'Inactivo'}</span></td>
                          <td>{t.creado_por || 'Admin'}</td>
                          <td>
                            <div className="actions-cell">
                              <button className="status-btn" onClick={() => { setTrabajadorEditando(t); setNuevoTrabajador({ nombre_completo: t.nombre_completo, dni: t.dni, nivel: t.nivel }); setShowModalTrabajador(true) }}>Editar</button>
                              <button className="status-btn" onClick={() => setTrabajadorQR(t)}>QR</button>
                              <button className={`status-btn ${t.activo ? 'danger-action' : 'success-action'}`} onClick={() => cambiarEstadoTrabajador(t.id, t.activo)}>{t.activo ? 'Desactivar' : 'Activar'}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activePage === 'reportes' && (
            <div className="table-card">

              <div className="table-header">
                <div>
                  <span className="table-title">Reportes de asistencia</span>
                  <p className="table-subtitle">Consulta por fechas y filtros</p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="secondary-action" onClick={exportarExcel}>
                    Exportar Excel
                  </button>

                  <button className="primary-action" onClick={cargarReportes}>
                    Buscar
                  </button>
                </div>
              </div>

              <div className="table-tools" style={{ display: 'grid', gap: '10px' }}>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={e => setFechaInicio(e.target.value)}
                    className="search-input"
                  />

                  <input
                    type="date"
                    value={fechaFin}
                    onChange={e => setFechaFin(e.target.value)}
                    className="search-input"
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    className="search-input"
                    value={filtroTipo}
                    onChange={e => setFiltroTipo(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                  </select>

                  <select
                    className="search-input"
                    value={filtroTrabajador}
                    onChange={e => setFiltroTrabajador(e.target.value)}
                  >
                    <option value="">Todos los trabajadores</option>
                    {trabajadores.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nombre_completo}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {loadingReportes ? (
                <div className="empty-rows">Cargando...</div>
              ) : registros.length === 0 ? (
                <div className="empty-rows">Sin resultados</div>
              ) : (
                <div className="responsive-table">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Trabajador</th>
                        <th>DNI</th>
                        <th>Tipo</th>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Registrado por</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registros.map(r => {
                        const fecha = new Date(r.fecha_hora)

                        return (
                          <tr key={r.id}>
                            <td>{r.trabajadores?.nombre_completo}</td>
                            <td>{r.trabajadores?.dni}</td>
                            <td>
                              <span className={`badge ${r.tipo === 'entrada' ? 'entrada' : 'salida'}`}>
                                {r.tipo}
                              </span>
                            </td>
                            <td>{fecha.toLocaleDateString('es-PE')}</td>
                            <td>{fecha.toLocaleTimeString('es-PE', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</td>
                            <td>{r.registrado_por}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activePage === 'usuarios' && (
            <div className="table-card">

              <div className="table-header">
                <div>
                  <span className="table-title">Usuarios del sistema</span>
                  <p className="table-subtitle">Administradores y porteros</p>
                </div>

                <button
                  className="primary-action"
                  onClick={() => {
                    setNuevoUsuario({
                      usuario: '',
                      password: '',
                      rol: 'portero'
                    })
                    setShowModalUsuario(true)
                  }}
                >
                  + Nuevo usuario
                </button>
              </div>

              {loadingUsuarios ? (
                <div className="empty-rows">Cargando...</div>
              ) : (
                <div className="responsive-table">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Rol</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map(u => (
                        <tr key={u.id}>
                          <td>{u.usuario}</td>
                          <td>
                            <span className="badge">
                              {u.rol}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}
        </div>
      </main>

      {/* ── MODAL TRABAJADOR ── */}
      {showModalTrabajador && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>{trabajadorEditando ? 'Editar trabajador' : 'Nuevo trabajador'}</h2>
                <p>{trabajadorEditando ? 'Actualiza los datos del trabajador' : 'Registra personal del cafetín'}</p>
              </div>
            </div>
            <form className="modal-form" onSubmit={guardarTrabajador}>
              <div className="field">
                <label>Nombre completo</label>
                <input value={nuevoTrabajador.nombre_completo} onChange={e => setNuevoTrabajador({ ...nuevoTrabajador, nombre_completo: e.target.value })} placeholder="Ej. Juan Pérez" />
              </div>
              <div className="field">
                <label>DNI</label>
                <input value={nuevoTrabajador.dni} onChange={e => setNuevoTrabajador({ ...nuevoTrabajador, dni: e.target.value })} placeholder="Ej. 12345678" />
              </div>
              <div className="field">
                <label>Nivel</label>
                <select value={nuevoTrabajador.nivel} onChange={e => setNuevoTrabajador({ ...nuevoTrabajador, nivel: e.target.value })}>
                  <option value="primaria">Primaria</option>
                  <option value="secundaria">Secundaria</option>
                </select>
              </div>
              <div className="field">
                <label>Foto del trabajador</label>
                <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f && !f.type.startsWith('image/')) { alert('Selecciona una imagen válida'); return }; setFotoTrabajador(f) }} />
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => { setShowModalTrabajador(false); setFotoTrabajador(null); setTrabajadorEditando(null); setNuevoTrabajador({ nombre_completo: '', dni: '', nivel: 'primaria' }) }}>Cancelar</button>
                <button type="submit" className="primary-action">{trabajadorEditando ? 'Actualizar trabajador' : 'Guardar trabajador'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CARNET QR ── */}
      {trabajadorQR && (
        <div className="modal-overlay">
          <div className="modal-card qr-card">
            <div className="modal-header">
              <div>
                <h2>Carnet QR</h2>
                <p>Credencial del trabajador</p>
              </div>
              <button className="modal-close" onClick={() => setTrabajadorQR(null)}>×</button>
            </div>

            <div className="carnet-preview" ref={carnetRef}>

              {/* Header */}
              <div className="carnet-top">
                <p className="carnet-inst">I.E. Crl José Joaquín Inclán</p>
              </div>

              {/* Foto */}
              <div className="carnet-photo-wrap">
                {trabajadorQR.foto_url ? (
                  <img
                    src={trabajadorQR.foto_url}
                    alt={trabajadorQR.nombre_completo}
                    className="carnet-photo"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="carnet-photo-placeholder">
                    {trabajadorQR.nombre_completo?.charAt(0)?.toUpperCase() || 'T'}
                  </div>
                )}
              </div>

              {/* Nombre y DNI */}
              <div className="carnet-info">
                <h3>{trabajadorQR.nombre_completo}</h3>
                <div className="carnet-dni">DNI: {trabajadorQR.dni}</div>
              </div>

              {/* QR */}
              <div className="carnet-qr-wrap">
                <div className="carnet-qr-box">
                  <QRCodeCanvas
                    value={String(trabajadorQR.id)}
                    size={220}   // más resolución
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setTrabajadorQR(null)}>Cerrar</button>
              <button className="primary-action" onClick={descargarCarnet}>Descargar carnet</button>
            </div>
          </div>
        </div>
      )}
      {showModalUsuario && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>Nuevo usuario</h2>
                <p>Crear acceso al sistema</p>
              </div>

              <button className="modal-close" onClick={() => {
                setShowModalUsuario(false)
                setNuevoUsuario({
                  usuario: '',
                  password: '',
                  rol: 'portero'
                })
              }}>
                ×
              </button>
            </div>

            <form className="modal-form" onSubmit={crearUsuario}>

              <div className="field">
                <label>Usuario</label>
                <input
                  value={nuevoUsuario.usuario}
                  onChange={e => setNuevoUsuario({
                    ...nuevoUsuario,
                    usuario: e.target.value
                  })}
                />
              </div>

              <div className="field">
                <label>Contraseña</label>
                <input
                  type="password"
                  value={nuevoUsuario.password}
                  onChange={e => setNuevoUsuario({
                    ...nuevoUsuario,
                    password: e.target.value
                  })}
                />
              </div>

              <div className="field">
                <label>Rol</label>
                <select
                  value={nuevoUsuario.rol}
                  onChange={e => setNuevoUsuario({
                    ...nuevoUsuario,
                    rol: e.target.value
                  })}
                >
                  <option value="admin">Admin</option>
                  <option value="portero">Portero</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowModalUsuario(false)
                    setNuevoUsuario({
                      usuario: '',
                      password: '',
                      rol: 'portero'
                    })
                  }}
                >
                  Cancelar
                </button>

                <button type="submit" className="primary-action">
                  Crear usuario
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  )
}