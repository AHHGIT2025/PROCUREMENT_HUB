// // FILE: src/pages/Login.tsx

// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import api from '../api/client';

// export default function Login() {
//   const nav = useNavigate();
//   const [email, setEmail]       = useState('');
//   const [password, setPassword] = useState('');
//   const [err, setErr]           = useState('');
//   const [loading, setLoading]   = useState(false);
//   const [showPass, setShowPass] = useState(false);

//   async function submit(e: any) {
//     e.preventDefault();
//     setErr('');
//     setLoading(true);
//     try {
//       const res = await api.post('/auth/login', { email, password });
//       localStorage.setItem('token', res.data.token);
//       localStorage.setItem('user', JSON.stringify(res.data.user));
//       nav('/dashboard');
//     } catch {
//       setErr('Invalid email or password. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div style={{
//       minHeight: '100vh',
//       display: 'grid',
//       gridTemplateColumns: '1fr 1fr',
//       fontFamily: 'Inter, sans-serif',
//       background: '#F8FAFC'
//     }}>

//       {/* LEFT — Brand Panel */}
//       <div style={{
//         background: 'linear-gradient(160deg, #031635 0%, #1a2b4b 60%, #0051d5 100%)',
//         padding: '48px',
//         display: 'flex',
//         flexDirection: 'column',
//         justifyContent: 'space-between',
//         position: 'relative',
//         overflow: 'hidden'
//       }}>

//         {/* Background pattern */}
//         <div style={{
//           position: 'absolute', inset: 0, opacity: 0.04,
//           backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
//           backgroundSize: '60px 60px'
//         }} />

//         {/* Logo */}
//         <div style={{ position: 'relative', zIndex: 1 }}>
//           <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
//             <div style={{
//               width: '40px', height: '40px', borderRadius: '8px',
//               background: 'rgba(255,255,255,0.15)',
//               display: 'flex', alignItems: 'center', justifyContent: 'center',
//               fontSize: '20px'
//             }}>
//               🏢
//             </div>
//             <div>
//               <div style={{ color: 'white', fontFamily: 'Hanken Grotesk, sans-serif', fontSize: '18px', fontWeight: 700 }}>
//                 Al Hattab Holding
//               </div>
//               <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', letterSpacing: '0.08em' }}>
//                 PROCUREMENT HUB
//               </div>
//             </div>
//           </div>

//           <h1 style={{
//             fontFamily: 'Hanken Grotesk, sans-serif',
//             fontSize: '36px', fontWeight: 700,
//             color: 'white', lineHeight: 1.2,
//             marginBottom: '16px'
//           }}>
//             Enterprise<br />Procurement<br />Management
//           </h1>

//           <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', lineHeight: 1.7, maxWidth: '380px' }}>
//             Streamline purchase requests, approvals, and Oracle ERP integration across 25+ companies under Al Hattab Holding.
//           </p>
//         </div>

//         {/* Feature highlights */}
//         <div style={{ position: 'relative', zIndex: 1 }}>
//           {[
//             { icon: '✅', text: 'Dynamic approval workflows' },
//             { icon: '🏢', text: 'Multi-company support' },
//             { icon: '🔗', text: 'Oracle ERP integration' },
//             { icon: '📊', text: 'Real-time tracking & audit' },
//           ].map((f, i) => (
//             <div key={i} style={{
//               display: 'flex', alignItems: 'center', gap: '10px',
//               marginBottom: '12px'
//             }}>
//               <span style={{ fontSize: '16px' }}>{f.icon}</span>
//               <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>{f.text}</span>
//             </div>
//           ))}

//           <div style={{
//             marginTop: '32px', padding: '16px',
//             background: 'rgba(255,255,255,0.06)',
//             borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)'
//           }}>
//             <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', letterSpacing: '0.08em', marginBottom: '8px' }}>
//               DEMO CREDENTIALS
//             </div>
//             <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>
//               admin@alhattab.com<br />Admin@123
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* RIGHT — Login Form */}
//       <div style={{
//         display: 'flex', alignItems: 'center', justifyContent: 'center',
//         padding: '48px', background: '#F8FAFC'
//       }}>
//         <div style={{ width: '100%', maxWidth: '420px' }}>

//           {/* Form header */}
//           <div style={{ marginBottom: '32px' }}>
//             <h2 style={{
//               fontFamily: 'Hanken Grotesk, sans-serif',
//               fontSize: '28px', fontWeight: 600,
//               color: '#0b1c30', marginBottom: '8px'
//             }}>
//               Welcome back
//             </h2>
//             <p style={{ color: '#64748b', fontSize: '14px' }}>
//               Sign in to your procurement account
//             </p>
//           </div>

//           {/* Error */}
//           {err && (
//             <div style={{
//               background: '#FFF1F2', border: '1px solid #fecdd3',
//               borderRadius: '6px', padding: '12px 16px',
//               color: '#E11D48', fontSize: '13px', marginBottom: '20px',
//               display: 'flex', alignItems: 'center', gap: '8px'
//             }}>
//               <span>⚠️</span> {err}
//             </div>
//           )}

//           <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

//             {/* Email */}
//             <div>
//               <label style={{
//                 display: 'block', fontSize: '13px', fontWeight: 600,
//                 color: '#44474e', marginBottom: '6px'
//               }}>
//                 Email Address
//               </label>
//               <input
//                 type="email"
//                 value={email}
//                 onChange={e => setEmail(e.target.value)}
//                 placeholder="you@alhattab.com"
//                 required
//                 style={{
//                   width: '100%', padding: '10px 14px',
//                   border: '1px solid #E2E8F0', borderRadius: '4px',
//                   fontSize: '14px', color: '#0b1c30', background: 'white',
//                   outline: 'none', boxSizing: 'border-box',
//                   fontFamily: 'Inter, sans-serif',
//                   transition: 'border-color 0.15s'
//                 }}
//                 onFocus={e => e.target.style.borderColor = '#0051d5'}
//                 onBlur={e => e.target.style.borderColor = '#E2E8F0'}
//               />
//             </div>

//             {/* Password */}
//             <div>
//               <label style={{
//                 display: 'block', fontSize: '13px', fontWeight: 600,
//                 color: '#44474e', marginBottom: '6px'
//               }}>
//                 Password
//               </label>
//               <div style={{ position: 'relative' }}>
//                 <input
//                   type={showPass ? 'text' : 'password'}
//                   value={password}
//                   onChange={e => setPassword(e.target.value)}
//                   placeholder="Enter your password"
//                   required
//                   style={{
//                     width: '100%', padding: '10px 40px 10px 14px',
//                     border: '1px solid #E2E8F0', borderRadius: '4px',
//                     fontSize: '14px', color: '#0b1c30', background: 'white',
//                     outline: 'none', boxSizing: 'border-box',
//                     fontFamily: 'Inter, sans-serif',
//                     transition: 'border-color 0.15s'
//                   }}
//                   onFocus={e => e.target.style.borderColor = '#0051d5'}
//                   onBlur={e => e.target.style.borderColor = '#E2E8F0'}
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPass(!showPass)}
//                   style={{
//                     position: 'absolute', right: '12px', top: '50%',
//                     transform: 'translateY(-50%)',
//                     background: 'none', border: 'none',
//                     cursor: 'pointer', color: '#94a3b8', fontSize: '16px'
//                   }}
//                 >
//                   {showPass ? '🙈' : '👁️'}
//                 </button>
//               </div>
//             </div>

//             {/* Submit */}
//             <button
//               type="submit"
//               disabled={loading}
//               style={{
//                 width: '100%', padding: '12px',
//                 background: loading ? '#64748b' : '#1a2b4b',
//                 color: 'white', border: 'none', borderRadius: '4px',
//                 fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
//                 transition: 'background 0.15s', marginTop: '8px',
//                 display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
//               }}
//               onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#0051d5'; }}
//               onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#1a2b4b'; }}
//             >
//               {loading ? (
//                 <>
//                   <span style={{
//                     width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)',
//                     borderTopColor: 'white', borderRadius: '50%',
//                     display: 'inline-block', animation: 'spin 0.8s linear infinite'
//                   }} />
//                   Signing in...
//                 </>
//               ) : (
//                 'Sign In →'
//               )}
//             </button>

//           </form>

//           {/* Footer */}
//           <div style={{
//             marginTop: '32px', paddingTop: '24px',
//             borderTop: '1px solid #E2E8F0',
//             display: 'flex', justifyContent: 'space-between',
//             alignItems: 'center'
//           }}>
//             <span style={{ fontSize: '12px', color: '#94a3b8' }}>
//               © 2026 Al Hattab Holding
//             </span>
//             <span style={{
//               fontSize: '11px', color: '#94a3b8',
//               fontFamily: 'JetBrains Mono, monospace'
//             }}>
//               v2.0.0
//             </span>
//           </div>

//         </div>
//       </div>

//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono&display=swap');
//         @keyframes spin { to { transform: rotate(360deg); } }
//         @media (max-width: 768px) {
//           .login-grid { grid-template-columns: 1fr !important; }
//         }
//       `}</style>

//     </div>
//   );
// }
 // src/pages/LoginPage.tsx
// src/pages/Login.tsx



///////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////// 
// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../api/client";
// import { Loader2, Eye, EyeOff, LogIn, AlertTriangle } from "lucide-react";

// export default function Login() {
//   const navigate = useNavigate();
//   const [email, setEmail]       = useState("");
//   const [password, setPassword] = useState("");
//   const [showPw, setShowPw]     = useState(false);
//   const [loading, setLoading]   = useState(false);
//   const [error, setError]       = useState("");

//   // ── Session-expired banner ──────────────────────────────────────────
//   // client.ts's 401 interceptor sets this flag before bouncing here when
//   // a token expires or is rejected mid-session, so the user sees a clean
//   // message instead of just landing back on the login screen confused.
//   useEffect(() => {
//     if (sessionStorage.getItem("sessionExpired")) {
//       setError("Your session has expired. Please sign in again.");
//       sessionStorage.removeItem("sessionExpired");
//     }
//   }, []);

//   async function handleLogin(e: React.FormEvent) {
//     e.preventDefault();
//     setError("");
//     if (!email.trim() || !password) {
//       setError("Please enter both email and password.");
//       return;
//     }
//     setLoading(true);
//     try {
//       const res = await api.post("/auth/login", { email: email.trim(), password });
//       const { token, user } = res.data?.data ?? res.data;
//       localStorage.setItem("token", token);
//       localStorage.setItem("user", JSON.stringify(user));
//       navigate("/dashboard");
//     } catch (err: any) {
//       setError(err?.response?.data?.message || "Invalid email or password.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4">
//       <div className="w-full max-w-md">

//         {/* Logo / Branding */}
//         <div className="text-center mb-8">
//           <div className="w-16 h-16 bg-white rounded-2xl shadow-lg mx-auto mb-4 flex items-center justify-center">
//             {/* Replace with <img src="/logo.png" ... /> once a holding logo file is available */}
//             <span className="text-2xl font-bold text-slate-900">AHH</span>
//           </div>
//           <h1 className="text-2xl font-bold text-white">Al Hattab Holding</h1>
//           <p className="text-slate-400 text-sm mt-1">Procurement Hub</p>
//         </div>

//         {/* Login Card */}
//         <div className="bg-white rounded-2xl shadow-2xl p-8">
//           <div className="mb-6">
//             <h2 className="text-xl font-semibold text-gray-800">Sign in to your account</h2>
//             <p className="text-sm text-gray-400 mt-1">Enter your credentials to continue</p>
//           </div>

//           {error && (
//             <div className="mb-5 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
//               <AlertTriangle size={16} className="mt-0.5 shrink-0" />
//               {error}
//             </div>
//           )}

//           <form onSubmit={handleLogin} className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
//               <input
//                 type="text"
//                 value={email}
//                 onChange={e => setEmail(e.target.value)}
//                 placeholder="you@alhattabholding.com"
//                 autoComplete="username"
//                 className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
//               />
//             </div>

//             <div>
//               <div className="flex items-center justify-between mb-1.5">
//                 <label className="block text-sm font-medium text-gray-600">Password</label>
//                 {/* Forgot-password flow isn't built yet — disabled for now
//                     so it doesn't send anyone to a dead route. Swap this
//                     span back to the onClick button once /forgot-password
//                     actually exists. */}
//                 <span
//                   className="text-xs text-gray-300 font-medium cursor-not-allowed select-none"
//                   title="Coming soon"
//                 >
//                   Forgot password?
//                 </span>
//               </div>
//               <div className="relative">
//                 <input
//                   type={showPw ? "text" : "password"}
//                   value={password}
//                   onChange={e => setPassword(e.target.value)}
//                   placeholder="••••••••"
//                   autoComplete="current-password"
//                   className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPw(v => !v)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
//                 >
//                   {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
//                 </button>
//               </div>
//             </div>

//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition disabled:opacity-50 shadow-sm"
//             >
//               {loading ? (
//                 <><Loader2 size={16} className="animate-spin" /> Signing in...</>
//               ) : (
//                 <><LogIn size={16} /> Sign In</>
//               )}
//             </button>
//           </form>
//         </div>

//         {/* Footer credit */}
//         <p className="text-center text-xs text-slate-500 mt-6">
//           Developed &amp; maintained by the Al Hattab Holding IT Department
//         </p>
//       </div>
//     </div>
//   );
// }
///////////////////////////////////////////////08/28/2026


// src/pages/Login.tsx
// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../api/client";
// import { Loader2, Eye, EyeOff, LogIn, AlertTriangle, PlayCircle, X } from "lucide-react";

// export default function Login() {
//   const navigate = useNavigate();
//   const [email, setEmail]       = useState("");
//   const [password, setPassword] = useState("");
//   const [showPw, setShowPw]     = useState(false);
//   const [loading, setLoading]   = useState(false);
//   const [error, setError]       = useState("");
//   const [showTutorial, setShowTutorial] = useState(false);

//   // ── Session-expired banner ──────────────────────────────────────────
//   // client.ts's 401 interceptor sets this flag before bouncing here when
//   // a token expires or is rejected mid-session, so the user sees a clean
//   // message instead of just landing back on the login screen confused.
//   useEffect(() => {
//     if (sessionStorage.getItem("sessionExpired")) {
//       setError("Your session has expired. Please sign in again.");
//       sessionStorage.removeItem("sessionExpired");
//     }
//   }, []);

//   async function handleLogin(e: React.FormEvent) {
//     e.preventDefault();
//     setError("");
//     if (!email.trim() || !password) {
//       setError("Please enter both email and password.");
//       return;
//     }
//     setLoading(true);
//     try {
//       const res = await api.post("/auth/login", { email: email.trim(), password });
//       const { token, user } = res.data?.data ?? res.data;
//       localStorage.setItem("token", token);
//       localStorage.setItem("user", JSON.stringify(user));
//       navigate("/dashboard");
//     } catch (err: any) {
//       setError(err?.response?.data?.message || "Invalid email or password.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4">
//       <div className="w-full max-w-md">

//         {/* Logo / Branding */}
//         <div className="text-center mb-8">
//           <div className="w-16 h-16 bg-white rounded-2xl shadow-lg mx-auto mb-4 flex items-center justify-center">
//             <span className="text-2xl font-bold text-slate-900">AHH</span>
//           </div>
//           <h1 className="text-2xl font-bold text-white">Al Hattab Holding</h1>
//           <p className="text-slate-400 text-sm mt-1">Procurement Hub</p>
//         </div>

//         {/* Login Card */}
//         <div className="bg-white rounded-2xl shadow-2xl p-8">
//           <div className="mb-6">
//             <h2 className="text-xl font-semibold text-gray-800">Sign in to your account</h2>
//             <p className="text-sm text-gray-400 mt-1">Enter your credentials to continue</p>
//           </div>

//           {error && (
//             <div className="mb-5 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
//               <AlertTriangle size={16} className="mt-0.5 shrink-0" />
//               {error}
//             </div>
//           )}

//           <form onSubmit={handleLogin} className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
//               <input
//                 type="text"
//                 value={email}
//                 onChange={e => setEmail(e.target.value)}
//                 placeholder="you@alhattabholding.com"
//                 autoComplete="username"
//                 className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
//               />
//             </div>

//             <div>
//               <div className="flex items-center justify-between mb-1.5">
//                 <label className="block text-sm font-medium text-gray-600">Password</label>
//               </div>
//               <div className="relative">
//                 <input
//                   type={showPw ? "text" : "password"}
//                   value={password}
//                   onChange={e => setPassword(e.target.value)}
//                   placeholder="••••••••"
//                   autoComplete="current-password"
//                   className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPw(v => !v)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
//                   tabIndex={-1}
//                 >
//                   {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
//                 </button>
//               </div>
//             </div>

//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition disabled:opacity-50 shadow-sm"
//             >
//               {loading ? (
//                 <><Loader2 size={16} className="animate-spin" /> Signing in...</>
//               ) : (
//                 <><LogIn size={16} /> Sign In</>
//               )}
//             </button>
//           </form>

//           {/* Tutorial video link — optional, opens in a modal so people never
//               leave this page. */}
//           <button
//             type="button"
//             onClick={() => setShowTutorial(true)}
//             className="w-full flex items-center justify-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 mt-5 transition"
//           >
//             <PlayCircle size={15} />
//             Watch how to use this system
//           </button>
//         </div>

//         {/* Footer credit */}
//         <p className="text-center text-xs text-slate-500 mt-6">
//           Developed &amp; maintained by the Al Hattab Holding IT Department
//         </p>
//       </div>

//       {/* Tutorial video modal */}
//       {showTutorial && (
//         <div
//           className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
//           onClick={() => setShowTutorial(false)}
//         >
//           <div
//             className="bg-black rounded-2xl overflow-hidden shadow-2xl w-full max-w-3xl relative"
//             onClick={e => e.stopPropagation()}
//           >
//             <button
//               onClick={() => setShowTutorial(false)}
//               className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition"
//             >
//               <X size={18} />
//             </button>
//             <video
//               src="/videos/PROCUREMENTHUB.mp4"
//               controls
//               autoPlay
//               className="w-full aspect-video"
//             >
//               Your browser does not support the video tag.
//             </video>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
////////////////////////////sir design 
// src/pages/Login.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { Loader2, Eye, EyeOff, AlertTriangle, Building2, PlayCircle, X } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("sessionExpired")) {
      setError("Your session has expired. Please sign in again.");
      sessionStorage.removeItem("sessionExpired");
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email: email.trim(), password });
      const { token, user } = res.data?.data ?? res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at top, #1e3a8a 0%, #0b1c3d 45%, #060f24 100%)" }}
    >
      <div className="w-full max-w-md">
        <div className="rounded-2xl shadow-2xl p-8" style={{ background: "#0d1f3c", border: "1px solid rgba(255,255,255,0.08)" }}>

          <div className="text-center mb-7">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Building2 size={26} className="text-blue-400" />
              <h1 className="text-2xl font-bold text-white tracking-tight">AHH Procurement Hub</h1>
            </div>
            <p className="text-slate-400 text-xs font-semibold tracking-widest uppercase">
              Procurement Management Platform
            </p>
            <p className="text-slate-300 text-sm mt-2">
              by <span className="font-semibold text-white">Praxivo Labs</span>
            </p>
            <p className="text-slate-500 text-xs italic mt-0.5">
              Turning Ideas into Intelligence
            </p>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] font-semibold tracking-widest text-slate-500">CREDENTIALS</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold tracking-wide text-slate-400 mb-1.5 uppercase">
                Email Address
              </label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. admin@alhattabholding.com"
                autoComplete="username"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-blue-500"
                style={{ background: "#132a4d", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wide text-slate-400 mb-1.5 uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-2.5 pr-11 text-sm text-white placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-blue-500"
                  style={{ background: "#132a4d", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 shadow-lg"
            >
              {loading ? (<><Loader2 size={16} className="animate-spin" /> Signing in...</>) : "Sign In"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 mt-5 transition"
          >
            <PlayCircle size={15} />
            Watch how to use this system
          </button>

          <div className="h-px bg-white/10 mt-6 mb-4" />
          <p className="text-center text-xs font-semibold text-slate-400">
            AHH Procurement Hub · Version 1.0.0
          </p>
          <p className="text-center text-[11px] text-slate-500 mt-0.5">
            © 2026 Praxivo Labs. All rights reserved.
          </p>
        </div>
      </div>

      {showTutorial && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setShowTutorial(false)}
        >
          <div
            className="bg-black rounded-2xl overflow-hidden shadow-2xl w-full max-w-3xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTutorial(false)}
              className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition"
            >
              <X size={18} />
            </button>
            <video src="/videos/PROCUREMENTHUB.mp4" controls autoPlay className="w-full aspect-video">
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </div>
  );
}


