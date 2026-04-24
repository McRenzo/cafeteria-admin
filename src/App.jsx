import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, ClipboardList, UserCog,
  LogOut, Coffee, Sun, Moon, TrendingUp, Clock, AlertCircle,
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

      const { count: totalTrabajadores } = await supabase
        .from('trabajadores')
        .select('*', { count: 'exact', head: true })

      const { count: activos } = await supabase
        .from('trabajadores')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true)

      const { count: entradasHoy } = await supabase
        .from('asistencia')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'entrada')
        .gte('fecha_hora', inicio.toISOString())
        .lte('fecha_hora', fin.toISOString())

      const { count: salidasHoy } = await supabase
        .from('asistencia')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'salida')
        .gte('fecha_hora', inicio.toISOString())
        .lte('fecha_hora', fin.toISOString())

      const { data: ultimosRegistros } = await supabase
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
        .order('fecha_hora', { ascending: false })
        .limit(8)

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
            <div className="user-avatar">{session.usuario.charAt(0).toUpperCase()}</div>
            <span className="user-name">{session.usuario}</span>
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
                <span className="badge">Hoy</span>
              </div>
              {dashboardData.ultimosRegistros.length === 0 ? (
                <div className="empty-rows">
                  <p>Sin registros aún</p>
                </div>
              ) : (
                <div className="records-list">
                  {dashboardData.ultimosRegistros.map((r) => (
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
                          {new Date(r.fecha_hora).toLocaleTimeString('es-PE', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>}

          {activePage !== 'dashboard' && (
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