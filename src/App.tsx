import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Transacoes from "./pages/Transacoes";
import Lembretes from "./pages/Lembretes";
import Categorias from "./pages/Categorias";
import Relatorios from "./pages/Relatorios";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";
import Plano from "./pages/Plano";
import Admin from "./pages/Admin";
import Teste from "./pages/Teste";

const queryClient = new QueryClient();

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
          console.log('Perfil carregado:', profile); // Debug
          setUserProfile(profile);
        } else {
          console.log('Erro ou perfil não encontrado:', error); // Debug
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      }
    };

    carregarPerfil();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const fullName = userProfile?.nome || userProfile?.name || userProfile?.full_name || user?.email?.split('@')[0] || 'Lincoln Cesar Gomes';
  const firstName = fullName?.split(' ')[0] || 'Lincoln';
  console.log('Nome completo:', fullName); // Debug
  console.log('Primeiro nome:', firstName); // Debug
  return <AppLayout userName={firstName}>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
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
      <Route path="*" element={<NotFound />} />
    </Routes>
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
