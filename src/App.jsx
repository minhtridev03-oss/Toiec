import React, { Suspense, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useLocale } from './contexts/LocaleContext';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import GlobalSkeletonLoader from './components/layout/GlobalSkeletonLoader';
import GlobalDictionary from './components/GlobalDictionary';
import GlobalFeedback from './components/GlobalFeedback';
import ErrorBoundary from './components/ErrorBoundary';

const Dashboard = React.lazy(() => import('./components/dashboard/Dashboard'));
const Auth = React.lazy(() => import('./pages/Auth'));
const Categories = React.lazy(() => import('./pages/Categories'));
const SubCategories = React.lazy(() => import('./pages/SubCategories'));
const PersonalVocabulary = React.lazy(() => import('./pages/PersonalVocabulary'));
const PersonalVocabReview = React.lazy(() => import('./pages/PersonalVocabReview'));
const TFlat = React.lazy(() => import('./pages/TFlat'));
const WordList = React.lazy(() => import('./pages/WordList'));
const VocabularyDetail = React.lazy(() => import('./pages/VocabularyDetail'));
const Practice = React.lazy(() => import('./pages/Practice'));
const KidsZone = React.lazy(() => import('./pages/KidsZone'));
const TenseList = React.lazy(() => import('./pages/TenseList'));
const TenseDetail = React.lazy(() => import('./pages/TenseDetail'));
const DictationList = React.lazy(() => import('./pages/DictationList'));
const DictationDetail = React.lazy(() => import('./pages/DictationDetail'));
const ReadingList = React.lazy(() => import('./pages/ReadingList'));
const ReadingDetail = React.lazy(() => import('./pages/ReadingDetail'));
const WritingList = React.lazy(() => import('./pages/WritingList'));
const WritingDetail = React.lazy(() => import('./pages/WritingDetail'));
const SpeakingList = React.lazy(() => import('./pages/SpeakingList'));
const SpeakingDetail = React.lazy(() => import('./pages/SpeakingDetail'));
const ShadowingList = React.lazy(() => import('./pages/ShadowingList'));
const ShadowingDetail = React.lazy(() => import('./pages/ShadowingDetail'));

const Profile = React.lazy(() => import('./pages/Profile'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));

// Admin
const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminWriting = React.lazy(() => import('./pages/admin/AdminWriting'));
const AdminReading = React.lazy(() => import('./pages/admin/AdminReading'));
const AdminDictation = React.lazy(() => import('./pages/admin/AdminDictation'));
const AdminGrammar = React.lazy(() => import('./pages/admin/AdminGrammar'));
const AdminVocab = React.lazy(() => import('./pages/admin/AdminVocab'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminFeedbacks = React.lazy(() => import('./pages/admin/AdminFeedbacks'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// HOC bảo vệ route (chỉ cho user đã đăng nhập)
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { t } = useLocale();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center">{t('common.loading')}</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// HOC bảo vệ route admin
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { t } = useLocale();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center">{t('common.loading')}</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  const role = user?.app_metadata?.role;
  if (role !== 'admin') return <Navigate to="/dashboard" replace />;
  
  return children;
};

// Layout chính khi đã login
const MainLayout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-pink-50 dark:bg-[#160B1E] font-sans transition-colors">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      
      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 w-full ${isCollapsed ? 'lg:ml-[5.5rem]' : 'lg:ml-64'} ml-0`}>
        <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 flex flex-col relative min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
      <GlobalDictionary />
      <GlobalFeedback />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<GlobalSkeletonLoader />}>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route 
          path="/reset-password" 
          element={
            <PrivateRoute>
              <ResetPassword />
            </PrivateRoute>
          } 
        />
        {/* Cấu trúc các trang con bên trong Layout chính */}
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <MainLayout><Navigate to="/dashboard" replace /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <MainLayout><Dashboard /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/tflat" 
          element={
            <PrivateRoute>
              <MainLayout><TFlat /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/categories" 
          element={
            <PrivateRoute>
              <MainLayout><Categories /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/my-vocabulary" 
          element={
            <PrivateRoute>
              <MainLayout><PersonalVocabulary /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/my-vocabulary/review/:index" 
          element={
            <PrivateRoute>
              <MainLayout><PersonalVocabReview /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/subcategories/:mainGroupName" 
          element={
            <PrivateRoute>
              <MainLayout><SubCategories /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/categories/:id" 
          element={
            <PrivateRoute>
              <MainLayout><WordList /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/vocabularies/:id" 
          element={
            <PrivateRoute>
              <MainLayout><VocabularyDetail /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/practice" 
          element={
            <PrivateRoute>
              <MainLayout><Practice /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route
          path="/kids"
          element={
            <PrivateRoute>
              <MainLayout><KidsZone /></MainLayout>
            </PrivateRoute>
          }
        />
        <Route 
          path="/tenses" 
          element={
            <PrivateRoute>
              <MainLayout><TenseList /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/speaking" 
          element={
            <PrivateRoute>
              <MainLayout><SpeakingList /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/speaking/:id" 
          element={
            <PrivateRoute>
              <MainLayout><SpeakingDetail /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/tenses/:slug" 
          element={
            <PrivateRoute>
              <MainLayout><TenseDetail /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/dictation" 
          element={
            <PrivateRoute>
              <MainLayout><DictationList /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/dictation/:id" 
          element={
            <PrivateRoute>
              <MainLayout><DictationDetail /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/reading" 
          element={
            <PrivateRoute>
              <MainLayout><ReadingList /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/shadowing" 
          element={
            <PrivateRoute>
              <MainLayout><ShadowingList /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/shadowing/:id" 
          element={
            <PrivateRoute>
              <MainLayout><ShadowingDetail /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/reading/:id" 
          element={
            <PrivateRoute>
              <MainLayout><ReadingDetail /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/writing" 
          element={
            <PrivateRoute>
              <MainLayout><WritingList /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/writing/:id" 
          element={
            <PrivateRoute>
              <MainLayout><WritingDetail /></MainLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <MainLayout><Profile /></MainLayout>
            </PrivateRoute>
          } 
        />

        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="writing" element={<AdminWriting />} />
          <Route path="reading" element={<AdminReading />} />
          <Route path="dictation" element={<AdminDictation />} />
          <Route path="grammar" element={<AdminGrammar />} />
          <Route path="vocab" element={<AdminVocab />} />
          <Route path="feedbacks" element={<AdminFeedbacks />} />
        </Route>

        {/* Catch-all: 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}
