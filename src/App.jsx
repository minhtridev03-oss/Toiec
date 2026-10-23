import React, { Suspense, useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useLocale } from './contexts/LocaleContext';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import GlobalSkeletonLoader from './components/layout/GlobalSkeletonLoader';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/layout/Footer';

const Dashboard = React.lazy(() => import('./components/dashboard/Dashboard'));
const Auth = React.lazy(() => import('./pages/Auth'));
const Categories = React.lazy(() => import('./pages/Categories'));
const SubCategories = React.lazy(() => import('./pages/SubCategories'));
const PersonalVocabulary = React.lazy(() => import('./pages/PersonalVocabulary'));
const PersonalVocabReview = React.lazy(() => import('./pages/PersonalVocabReview'));
const TFlat = React.lazy(() => import('./pages/TFlat'));
const WordList = React.lazy(() => import('./pages/WordList'));
const GlobalDictionary = React.lazy(() => import('./components/GlobalDictionary'));
const GlobalFeedback = React.lazy(() => import('./components/GlobalFeedback'));
const LearningBotDock = React.lazy(() => import('./components/layout/LearningBotDock'));
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
const Library = React.lazy(() => import('./pages/Library'));
const Games = React.lazy(() => import('./pages/Games'));
const MockTestList = React.lazy(() => import('./pages/MockTestList'));
const MockTestSession = React.lazy(() => import('./pages/MockTestSession'));

const Profile = React.lazy(() => import('./pages/Profile'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));

// Admin
const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminWriting = React.lazy(() => import('./pages/admin/AdminWriting'));
const AdminReading = React.lazy(() => import('./pages/admin/AdminReading'));
const AdminLibrary = React.lazy(() => import('./pages/admin/AdminLibrary'));
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
  return children ? children : <Outlet />;
};

// HOC bảo vệ route admin
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { t } = useLocale();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center">{t('common.loading')}</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  const role = user?.app_metadata?.role;
  if (role !== 'admin') return <Navigate to="/dashboard" replace />;
  
  return children ? children : <Outlet />;
};

// Layout chính duy trì liên tục khi chuyển đổi giữa các trang
const MainLayout = () => {
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
          <Outlet />
        </main>
        <Footer />
      </div>
      <Suspense fallback={null}>
        <LearningBotDock />
        <GlobalDictionary showTrigger={false} />
        <GlobalFeedback showTrigger={false} />
      </Suspense>
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

        {/* Chế độ toàn màn hình cho bài thi mock test */}
        <Route
          path="/mock-tests/:id"
          element={
            <PrivateRoute>
              <MockTestSession />
            </PrivateRoute>
          }
        />

        {/* Nhóm các trang học tập dùng chung MainLayout duy trì ổn định */}
        <Route 
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tflat" element={<TFlat />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/my-vocabulary" element={<PersonalVocabulary />} />
          <Route path="/my-vocabulary/review/:index" element={<PersonalVocabReview />} />
          <Route path="/subcategories/:mainGroupName" element={<SubCategories />} />
          <Route path="/categories/:id" element={<WordList />} />
          <Route path="/vocabularies/:id" element={<VocabularyDetail />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/games" element={<Games />} />
          <Route path="/kids" element={<KidsZone />} />
          <Route path="/tenses" element={<TenseList />} />
          <Route path="/tenses/:slug" element={<TenseDetail />} />
          <Route path="/speaking" element={<SpeakingList />} />
          <Route path="/speaking/:id" element={<SpeakingDetail />} />
          <Route path="/dictation" element={<DictationList />} />
          <Route path="/dictation/:id" element={<DictationDetail />} />
          <Route path="/reading" element={<ReadingList />} />
          <Route path="/reading/:id" element={<ReadingDetail />} />
          <Route path="/shadowing" element={<ShadowingList />} />
          <Route path="/shadowing/:id" element={<ShadowingDetail />} />
          <Route path="/writing" element={<WritingList />} />
          <Route path="/writing/:id" element={<WritingDetail />} />
          <Route path="/library" element={<Library />} />
          <Route path="/mock-tests" element={<MockTestList />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

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
          <Route path="library" element={<AdminLibrary />} />
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
