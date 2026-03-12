import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { AppLayout } from "./components/layout/AppLayout";
import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "./lib/supabase";
import { deriveDisplayName, deriveFirstName } from "./utils/profile-display";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transacoes = lazy(() => import("./pages/Transacoes"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Lembretes = lazy(() => import("./pages/Lembretes"));
const Categorias = lazy(() => import("./pages/Categorias"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Perfil = lazy(() => import("./pages/Perfil"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Plano = lazy(() => import("./pages/Plano"));
const Admin = lazy(() => import("./pages/Admin"));
const Teste = lazy(() => import("./pages/Teste"));
const Contas = lazy(() => import("./pages/Contas"));
const Cartoes = lazy(() => import("./pages/Cartoes"));
const Investimentos = lazy(() => import("./pages/Investimentos"));
const ConfigCategorias = lazy(() => import("./pages/ConfigCategorias"));
const Feedback = lazy(() => import("./pages/Feedback"));
const WhatsApp = lazy(() => import("./pages/WhatsApp"));
const Orcamentos = lazy(() => import("./pages/Orcamentos"));
const Diagnostico = lazy(() => import("./pages/Diagnostico"));
const Patrimonio = lazy(() => import("./pages/Patrimonio"));

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const carregarPerfil = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!error && profile) {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      }
    };

    carregarPerfil();
  }, [user]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const fullName = deriveDisplayName({ profile: userProfile, user });
  const firstName = deriveFirstName(fullName);
  return <AppLayout userName={firstName}>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route
          path="/auth"
          element={user ? <Navigate to="/dashboard" replace /> : <Auth />}
        />
        <Route
          path="/plano"
          element={<Plano />}
        />
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transacoes"
          element={
            <ProtectedRoute>
              <Transacoes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendario"
          element={
            <ProtectedRoute>
              <Calendario />
            </ProtectedRoute>
          }
        />
        <Route
          path="/categorias"
          element={
            <ProtectedRoute>
              <Categorias />
            </ProtectedRoute>
          }
        />
        <Route
          path="/relatorios"
          element={
            <ProtectedRoute>
              <Relatorios />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lembretes"
          element={
            <ProtectedRoute>
              <Lembretes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Perfil />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teste"
          element={
            <ProtectedRoute>
              <Teste />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contas"
          element={
            <ProtectedRoute>
              <Contas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cartoes"
          element={
            <ProtectedRoute>
              <Cartoes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/investimentos"
          element={
            <ProtectedRoute>
              <Investimentos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orcamentos"
          element={
            <ProtectedRoute>
              <Orcamentos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patrimonio"
          element={
            <ProtectedRoute>
              <Patrimonio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/config-categorias"
          element={
            <ProtectedRoute>
              <ConfigCategorias />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feedback"
          element={
            <ProtectedRoute>
              <Feedback />
            </ProtectedRoute>
          }
        />
        <Route
          path="/whatsapp"
          element={
            <ProtectedRoute>
              <WhatsApp />
            </ProtectedRoute>
          }
        />
        <Route
          path="/diagnostico"
          element={
            <ProtectedRoute>
              <Diagnostico />
            </ProtectedRoute>
          }
        />
        {/* <Route
          path="/relatorio-novo"
          element={
            <ProtectedRoute>
              <RelatorioNovo />
            </ProtectedRoute>
          }
        /> */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="financeapp-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
