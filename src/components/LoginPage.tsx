import { useState, type FormEvent } from "react";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  serverError: string;
}

export default function LoginPage({ onLogin, serverError }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onLogin(email, password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión.");
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-7 shadow-soft sm:p-9">
        <img src="/logo-rgr.png" alt="RGR Vehículos y Maquinarias" className="mx-auto mb-8 h-auto w-64 object-contain" />
        <h1 className="text-center text-2xl font-bold text-corporate-blue">Iniciar sesión</h1>
        <p className="mt-2 text-center text-sm text-slate-500">Ingresa tus credenciales para acceder al sistema.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block text-sm font-semibold text-slate-600">
            Correo
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-600">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
            />
          </label>
          {(error || serverError) && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error || serverError}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-corporate-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-600 disabled:cursor-wait disabled:opacity-70">
            {submitting ? "Verificando…" : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}
