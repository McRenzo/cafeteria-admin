import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, ClipboardList, UserCog,
  LogOut, Coffee, Sun, Moon, TrendingUp, Clock, AlertCircle, RefreshCw,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import './App.css'

export default function App() {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [loading, setLoading] = useState(false)
  const [activePage, setActivePage] = useState('dashboard')
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const savedSession = localStorage.getItem('admin_session')

    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession))
      } catch {
        localStorage.removeItem('admin_session')
      }
    }

    setCheckingSession(false)
  }, [])

  useEffect(() => {
    if (session) {
      localStorage.setItem('admin_session', JSON.stringify(session))
    }
  }, [session])

  useEffect(() => {
    if (session) {
      cargarDashboard()
    }
  }, [session])

  useEffect(() => {
    if (session && activePage === 'trabajadores') {
      cargarTrabajadores()
    }
  }, [session, activePage])

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
    }
    finally { setLoading(false) }
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
      const inicio = new Date(hoy)
      inicio.setHours(0, 0, 0, 0)

      const fin = new Date(hoy)
      fin.setHours(23, 59, 59, 999)

      const { count: totalTrabajadores, error: totalError } = await supabase
        .from('trabajadores')
        .select('*', { count: 'exact', head: true })
      if (totalError) throw totalError

      const { count: activos, error: activosError } = await supabase
        .from('trabajadores')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true)
      if (activosError) throw activosError

      const { count: entradasHoy, error: entradasError } = await supabase
        .from('asistencia')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'entrada')
        .gte('fecha_hora', inicio.toISOString())
        .lte('fecha_hora', fin.toISOString())
      if (entradasError) throw entradasError

      const { count: salidasHoy, error: salidasError } = await supabase
        .from('asistencia')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'salida')
        .gte('fecha_hora', inicio.toISOString())
        .lte('fecha_hora', fin.toISOString())
      if (salidasError) throw salidasError

      const { data: ultimosRegistros, error: registrosError } = await supabase
        .from('asistencia')
        .select(`
          id,
          fecha_hora,
          tipo,
          registrado_por,
          trabajadores (
            nombre_completo,
            dni,
            nivel
          )
        `)
        .gte('fecha_hora', inicio.toISOString())
        .lte('fecha_hora', fin.toISOString())
        .order('fecha_hora', { ascending: false })
        .limit(8)
      if (registrosError) throw registrosError

      setDashboardData({
        entradasHoy: entradasHoy || 0,
        salidasHoy: salidasHoy || 0,
        totalTrabajadores: totalTrabajadores || 0,
        activos: activos || 0,
        ultimosRegistros: ultimosRegistros || []
      })
    } catch (err) {
      console.error('Error cargando dashboard:', err)
    }
  }

  const cargarTrabajadores = async () => {
    setLoadingTrabajadores(true)

    try {
      const { data, error } = await supabase
        .from('trabajadores')
        .select('*')
        .order('nombre_completo', { ascending: true })

      if (error) throw error

      setTrabajadores(data || [])
    } catch (err) {
      console.error('Error cargando trabajadores:', err)
      alert('No se pudieron cargar los trabajadores')
    } finally {
      setLoadingTrabajadores(false)
    }
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trabajadores', label: 'Trabajadores', icon: Users },
    { id: 'reportes', label: 'Reportes', icon: ClipboardList },
    { id: 'usuarios', label: 'Usuarios', icon: UserCog },
  ]

  if (checkingSession) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <Coffee size={20} strokeWidth={2} />
          </div>
          <p className="login-sub">Cargando sesión...</p>
        </div>
      </div>
    )
  }

  /* ── LOGIN ── */
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

  /* ── ADMIN ── */
  const activeNav = navItems.find(n => n.id === activePage)

  const trabajadoresFiltrados = trabajadores.filter((t) => {
    const texto = busquedaTrabajador.toLowerCase()

    return (
      t.nombre_completo?.toLowerCase().includes(texto) ||
      t.dni?.includes(texto) ||
      t.nivel?.toLowerCase().includes(texto)
    )
  })

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Coffee size={18} strokeWidth={2} /></div>
          <div>
            <p className="brand-name">Cafetería</p>
            <p className="brand-role">Admin Panel</p>
          </div>
        </div>

        <nav className="nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item${activePage === id ? ' active' : ''}`} onClick={() => setActivePage(id)}>
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
              {activePage === id && <div className="nav-pip" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-row">
            <div className="user-avatar">
              {session?.usuario?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <span className="user-name">
              {session?.usuario || 'Administrador'}
            </span>
          </div>
          <button className="icon-btn danger" onClick={handleLogout} title="Cerrar sesión">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="topbar-title">{activeNav?.label}</h1>
            <p className="topbar-sub">Sistema de asistencia QR</p>
          </div>
          <div className="topbar-right">
            <div className="online-badge"><span className="online-dot" />En línea</div>
            <button className="theme-pill" onClick={cargarDashboard}>
              <RefreshCw size={13} />
              Actualizar
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
                <div className="empty-rows">
                  <p>Sin registros aún</p>
                </div>
              ) : (
                <div className="records-list">
                  {dashboardData.ultimosRegistros.map((r) => {
                    const fechaRegistro = new Date(r.fecha_hora)

                    return (
                      <div className="record-row" key={r.id}>
                        <div>
                          <p className="record-name">
                            {r.trabajadores?.nombre_completo || 'Sin nombre'}
                          </p>
                          <span className="record-detail">
                            DNI: {r.trabajadores?.dni || 'N/A'} · {r.trabajadores?.nivel || 'N/A'}
                          </span>
                        </div>

                        <div className="record-right">
                          <span className={`badge ${r.tipo === 'entrada' ? 'entrada' : 'salida'}`}>
                            {r.tipo}
                          </span>
                          <span className="record-time">
                            {fechaRegistro.toLocaleDateString('es-PE')} -{' '}
                            {fechaRegistro.toLocaleTimeString('es-PE', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
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
                  <p className="table-subtitle">
                    Gestión de trabajadores del cafetín
                  </p>
                </div>

                <button className="theme-pill" onClick={cargarTrabajadores}>
                  <RefreshCw size={13} />
                  Actualizar
                </button>
              </div>

              <div className="table-tools">
                <input
                  className="search-input"
                  placeholder="Buscar por nombre, DNI o nivel..."
                  value={busquedaTrabajador}
                  onChange={(e) => setBusquedaTrabajador(e.target.value)}
                />
              </div>

              {loadingTrabajadores ? (
                <div className="empty-rows">
                  <p>Cargando trabajadores...</p>
                </div>
              ) : trabajadoresFiltrados.length === 0 ? (
                <div className="empty-rows">
                  <p>No se encontraron trabajadores</p>
                </div>
              ) : (
                <div className="responsive-table">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Trabajador</th>
                        <th>DNI</th>
                        <th>Nivel</th>
                        <th>Estado</th>
                        <th>Creado por</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trabajadoresFiltrados.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <div className="worker-cell">
                              {t.foto_url ? (
                                <img src={t.foto_url} alt={t.nombre_completo} />
                              ) : (
                                <div className="worker-avatar">
                                  {t.nombre_completo?.charAt(0)?.toUpperCase() || 'T'}
                                </div>
                              )}

                              <span>{t.nombre_completo}</span>
                            </div>
                          </td>
                          <td>{t.dni}</td>
                          <td>{t.nivel}</td>
                          <td>
                            <span className={`badge ${t.activo ? 'entrada' : 'inactivo'}`}>
                              {t.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td>{t.creado_por || 'Admin'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activePage !== 'dashboard' && activePage !== 'trabajadores' && (
            <div className="empty-state">
              {activeNav && <activeNav.icon size={28} strokeWidth={1.2} />}
              <p>{activeNav?.label}</p>
              <span>Módulo en construcción</span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}