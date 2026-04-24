import { useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

function App() {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!usuario || !password) {
      alert('Ingresa usuario y contraseña')
      return
    }

    setLoading(true)

    try {
      const cleanUser = usuario.trim().toLowerCase()
      const cleanPass = password.trim()

      const { data, error } = await supabase
        .from('usuarios_app')
        .select('*')
        .eq('usuario', cleanUser)
        .single()

      if (error || !data) {
        alert('Usuario no encontrado')
        return
      }

      if (data.rol !== 'admin') {
        alert('Solo los administradores pueden ingresar al panel web')
        return
      }

      const { data: isValid, error: authError } = await supabase.rpc(
        'verificar_password',
        {
          p_usuario: cleanUser,
          p_pass: cleanPass,
        }
      )

      if (authError || !isValid) {
        alert('Contraseña incorrecta')
        return
      }

      setSession(data)
    } catch (error) {
      alert('Error de conexión con Supabase')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (session) {
    return (
      <div className="dashboard">
        <h1>Panel Administrador</h1>
        <p>Bienvenido, {session.usuario}</p>

        <button onClick={() => setSession(null)}>
          Cerrar sesión
        </button>
      </div>
    )
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="logo">☕</div>

        <h1>Panel Cafetería</h1>
        <p>Control de asistencia - Administrador</p>

        <form onSubmit={handleLogin}>
          <label>Usuario</label>
          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Ingresa tu usuario"
          />

          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresa tu contraseña"
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Validando...' : 'Iniciar sesión'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default App