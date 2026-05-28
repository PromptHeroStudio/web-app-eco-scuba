import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/dashboard");
    } catch (caughtError: unknown) {
      const errorMessage = caughtError instanceof Error ? caughtError.message : String(caughtError || "Pokušajte ponovo kasnije.");
      let description = errorMessage;
      if (description === "Invalid login credentials") {
        description = "Pogrešan email ili lozinka.";
      } else if (/email.*not.*confirmed|user.*not.*confirmed|not.*confirmed/i.test(description)) {
        description = "Email nije verificiran. Provjerite inbox i potvrdite vašu email adresu.";
      } else if (/network|fetch|connection/i.test(description)) {
        description = "Mrežna greška. Provjerite internet konekciju i pokušajte ponovo.";
      }
      toast({ title: "Greška pri prijavi", description, variant: "destructive" });
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        toast({ title: 'Greška pri Google prijavi', description: error?.message || 'Neuspjela OAuth inicijalizacija.', variant: 'destructive' });
        return;
      }

      if (data?.url) {
        // iframe / popup breaker
        if (window.self !== window.top) {
          window.top.location.href = data.url;
        } else {
          window.location.assign(data.url);
        }

        // fallback
        setTimeout(() => {
          try { window.open(data.url, '_top'); } catch {};
        }, 400);
      }
    } catch (_err) {
      toast({ title: 'Greška pri Google prijavi', description: 'Google prijava trenutno nije dostupna.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen h-screen w-full bg-fixed bg-cover bg-center bg-[url('/splash-a.png')] flex items-center justify-end">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-6xl mx-4 px-6">
        <div className="flex w-full justify-end pr-10 lg:pr-32">
          <div className="w-full max-w-md">
            <div className="rounded-[40px] border border-white/10 bg-white/5 backdrop-blur-md shadow-blue-500/5 p-8 lg:p-10 text-white">
              <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Prijavite se</h1>
                <p className="mt-2 text-sm text-white/80">Dobrodošli nazad. Nastavite svoju ekološku misiju.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-white">Email adresa</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="vas@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-[20px] border border-white/20 bg-white/5 px-10 py-3 text-white placeholder:text-white/40 focus:border-transparent focus:ring-2 focus:ring-cyan-400 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-white">Lozinka</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-[20px] border border-white/20 bg-white/5 px-10 py-3 pr-12 text-white placeholder:text-white/40 focus:border-transparent focus:ring-2 focus:ring-cyan-400 outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-100/80 hover:text-white"
                      aria-label={showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-xs text-white hover:underline transition-colors cursor-pointer">Zaboravili ste lozinku?</Link>
                </div>

                <Button
                  type="submit"
                  className={`w-full rounded-[20px] bg-white/10 border border-white/20 text-white font-semibold uppercase tracking-wider py-3 hover:bg-white/20 transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  disabled={loading || isLoading}
                >
                  {isLoading ? <div className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Prijava...</div> : 'Prijavite se'}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/20" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white/5 px-3 text-white/50">ili</span></div>
              </div>

              <Button
                variant="ghost"
                className={`w-full gap-3 rounded-[20px] border border-white/20 bg-white/10 px-4 py-3 text-sm text-white hover:bg-white/20 transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="h-5 w-5 mr-3"
                />
                <span className="font-medium text-white">Prijava putem Google računa</span>
              </Button>

              <p className="mt-6 text-center text-sm text-white/80">
                Nemate račun? <Link to="/register" className="text-white hover:underline transition-colors font-medium cursor-pointer">Registrujte se</Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
