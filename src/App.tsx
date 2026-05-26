// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import AppShell from '@/components/layout/AppShell';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const AuthCallback = lazy(() => import('@/pages/auth/AuthCallback'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const ProjectsList = lazy(() => import('@/pages/Projects'));
const ProjectEditor = lazy(() => import('@/pages/ProjectEditor'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Collaboration = lazy(() => import('@/pages/Collaboration'));
const Settings = lazy(() => import('@/pages/Settings'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const queryClient = new QueryClient();

const Loader = () => (
  <div className="flex items-center justify-center h-screen bg-bg-primary">
    <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
  </div>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              <Route element={<AuthGuard><AppShell /></AuthGuard>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/projects" element={<ProjectsList />} />
                <Route path="/projects/:id/edit" element={<ProjectEditor />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/collaboration" element={<Collaboration />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
