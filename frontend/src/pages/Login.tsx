// FILE: src/pages/Login.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function submit(e: any) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      nav('/dashboard');
    } catch {
      setErr('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      fontFamily: 'Inter, sans-serif',
      background: '#F8FAFC'
    }}>

      {/* LEFT — Brand Panel */}
      <div style={{
        background: 'linear-gradient(160deg, #031635 0%, #1a2b4b 60%, #0051d5 100%)',
        padding: '48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }}>

        {/* Background pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px'
            }}>
              🏢
            </div>
            <div>
              <div style={{ color: 'white', fontFamily: 'Hanken Grotesk, sans-serif', fontSize: '18px', fontWeight: 700 }}>
                Al Hattab Holding
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', letterSpacing: '0.08em' }}>
                PROCUREMENT HUB
              </div>
            </div>
          </div>

          <h1 style={{
            fontFamily: 'Hanken Grotesk, sans-serif',
            fontSize: '36px', fontWeight: 700,
            color: 'white', lineHeight: 1.2,
            marginBottom: '16px'
          }}>
            Enterprise<br />Procurement<br />Management
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', lineHeight: 1.7, maxWidth: '380px' }}>
            Streamline purchase requests, approvals, and Oracle ERP integration across 25+ companies under Al Hattab Holding.
          </p>
        </div>

        {/* Feature highlights */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {[
            { icon: '✅', text: 'Dynamic approval workflows' },
            { icon: '🏢', text: 'Multi-company support' },
            { icon: '🔗', text: 'Oracle ERP integration' },
            { icon: '📊', text: 'Real-time tracking & audit' },
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '16px' }}>{f.icon}</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>{f.text}</span>
            </div>
          ))}

          <div style={{
            marginTop: '32px', padding: '16px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', letterSpacing: '0.08em', marginBottom: '8px' }}>
              DEMO CREDENTIALS
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>
              admin@alhattab.com<br />Admin@123
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — Login Form */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px', background: '#F8FAFC'
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Form header */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontFamily: 'Hanken Grotesk, sans-serif',
              fontSize: '28px', fontWeight: 600,
              color: '#0b1c30', marginBottom: '8px'
            }}>
              Welcome back
            </h2>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Sign in to your procurement account
            </p>
          </div>

          {/* Error */}
          {err && (
            <div style={{
              background: '#FFF1F2', border: '1px solid #fecdd3',
              borderRadius: '6px', padding: '12px 16px',
              color: '#E11D48', fontSize: '13px', marginBottom: '20px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span>⚠️</span> {err}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Email */}
            <div>
              <label style={{
                display: 'block', fontSize: '13px', fontWeight: 600,
                color: '#44474e', marginBottom: '6px'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@alhattab.com"
                required
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1px solid #E2E8F0', borderRadius: '4px',
                  fontSize: '14px', color: '#0b1c30', background: 'white',
                  outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'border-color 0.15s'
                }}
                onFocus={e => e.target.style.borderColor = '#0051d5'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block', fontSize: '13px', fontWeight: 600,
                color: '#44474e', marginBottom: '6px'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%', padding: '10px 40px 10px 14px',
                    border: '1px solid #E2E8F0', borderRadius: '4px',
                    fontSize: '14px', color: '#0b1c30', background: 'white',
                    outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#0051d5'}
                  onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: '#94a3b8', fontSize: '16px'
                  }}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px',
                background: loading ? '#64748b' : '#1a2b4b',
                color: 'white', border: 'none', borderRadius: '4px',
                fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s', marginTop: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
              onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#0051d5'; }}
              onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#1a2b4b'; }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white', borderRadius: '50%',
                    display: 'inline-block', animation: 'spin 0.8s linear infinite'
                  }} />
                  Signing in...
                </>
              ) : (
                'Sign In →'
              )}
            </button>

          </form>

          {/* Footer */}
          <div style={{
            marginTop: '32px', paddingTop: '24px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              © 2026 Al Hattab Holding
            </span>
            <span style={{
              fontSize: '11px', color: '#94a3b8',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              v2.0.0
            </span>
          </div>

        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .login-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

    </div>
  );
}
 