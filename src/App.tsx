import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Loading } from '@/components/Feedback';
import { AdminMfaGate } from '@/components/AdminMfaGate';

// Public shell pages — loaded eagerly only for first paint.
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const BrowsePage = lazy(() => import('@/pages/BrowsePage').then((m) => ({ default: m.BrowsePage })));
const FeaturedPage = lazy(() => import('@/pages/FeaturedPage').then((m) => ({ default: m.FeaturedPage })));
const AboutPage = lazy(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const SellPage = lazy(() => import('@/pages/SellPage').then((m) => ({ default: m.SellPage })));
const AIAssistantPage = lazy(() => import('@/pages/AIAssistantPage').then((m) => ({ default: m.AIAssistantPage })));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })));
const SellerProfilePage = lazy(() => import('@/pages/SellerProfilePage').then((m) => ({ default: m.SellerProfilePage })));

// Auth pages — only needed at login/register time.
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const AdminLoginPage = lazy(() => import('@/pages/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const AdminSetupPage = lazy(() => import('@/pages/AdminSetupPage').then((m) => ({ default: m.AdminSetupPage })));

// Dashboards — heaviest pages, only needed by signed-in users.
const FarmerDashboard = lazy(() => import('@/pages/FarmerDashboard').then((m) => ({ default: m.FarmerDashboard })));
const BuyerDashboard = lazy(() => import('@/pages/BuyerDashboard').then((m) => ({ default: m.BuyerDashboard })));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminSecurityPage = lazy(() => import('@/pages/AdminSecurityPage').then((m) => ({ default: m.AdminSecurityPage })));

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth pages (no layout) */}
            <Route path="/login" element={<Suspense fallback={<Loading fullScreen />}><LoginPage /></Suspense>} />
            <Route path="/register" element={<Suspense fallback={<Loading fullScreen />}><RegisterPage /></Suspense>} />
            <Route path="/admin/login" element={<Suspense fallback={<Loading fullScreen />}><AdminLoginPage /></Suspense>} />
            <Route path="/reset-password" element={<Suspense fallback={<Loading fullScreen />}><ResetPasswordPage /></Suspense>} />
            <Route path="/admin/setup" element={<Suspense fallback={<Loading fullScreen />}><AdminSetupPage /></Suspense>} />

            {/* Layout-wrapped routes */}
            <Route
              path="/*"
              element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<Suspense fallback={<Loading />}><HomePage /></Suspense>} />
                    <Route path="/browse" element={<Suspense fallback={<Loading />}><BrowsePage /></Suspense>} />
                    <Route path="/featured" element={<Suspense fallback={<Loading />}><FeaturedPage /></Suspense>} />
                    <Route path="/about" element={<Suspense fallback={<Loading />}><AboutPage /></Suspense>} />
                    <Route path="/contact" element={<Suspense fallback={<Loading />}><ContactPage /></Suspense>} />
                    <Route path="/sell" element={<Suspense fallback={<Loading />}><SellPage /></Suspense>} />
                    <Route path="/assistant" element={<Suspense fallback={<Loading />}><AIAssistantPage /></Suspense>} />
                    <Route path="/product/:id" element={<Suspense fallback={<Loading />}><ProductDetailPage /></Suspense>} />
                    <Route path="/seller/:id" element={<Suspense fallback={<Loading />}><SellerProfilePage /></Suspense>} />

                    {/* Protected dashboards */}
                    <Route path="/farmer" element={
                      <ProtectedRoute roles={['farmer', 'admin']}>
                        <Suspense fallback={<Loading fullScreen />}><FarmerDashboard /></Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/buyer" element={
                      <ProtectedRoute>
                        <Suspense fallback={<Loading fullScreen />}><BuyerDashboard /></Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin" element={
                      <ProtectedRoute roles={['admin']}>
                        <AdminMfaGate><Suspense fallback={<Loading fullScreen />}><AdminDashboard /></Suspense></AdminMfaGate>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/security" element={
                      <ProtectedRoute roles={['admin']}>
                        <Suspense fallback={<Loading fullScreen />}><AdminSecurityPage /></Suspense>
                      </ProtectedRoute>
                    } />

                    {/* Fallback */}
                    <Route path="*" element={<Suspense fallback={<Loading />}><HomePage /></Suspense>} />
                  </Routes>
                </Layout>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
