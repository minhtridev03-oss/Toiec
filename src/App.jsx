import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { useAuth } from './contexts/AuthContext';
import { useLocale } from './contexts/LocaleContext';
import { useTheme } from './contexts/ThemeContext';
import { useAmbient } from './contexts/AmbientContext';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import BottomNav from './components/layout/BottomNav';
import AppDownloadBanner from './components/layout/AppDownloadBanner';
import GlobalSkeletonLoader from './components/layout/GlobalSkeletonLoader';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/layout/Footer';
import { usePlatform } from './hooks/usePlatform';

const Dashboard = React.lazy(() => import('./components/dashboard/Dashboard'));
const AuthModal = React.lazy(() => import('./components/auth/AuthModal'));
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
const _KidsZone = React.lazy(() => import('./pages/KidsZone'));
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
const AdminAvatarFrames = React.lazy(() => import('./pages/admin/AdminAvatarFrames'));
const AdminLevels = React.lazy(() => import('./pages/admin/AdminLevels'));
const AdminFeedbacks = React.lazy(() => import('./pages/admin/AdminFeedbacks'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// HOC bảo vệ route (chỉ cho user đã đăng nhập)
const PrivateRoute = ({ children }) => {
  const { user, loading, openAuthModal } = useAuth();
  const { t } = useLocale();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center">{t('common.loading')}</div>;
  if (!user) {
    openAuthModal?.('login');
    return <Navigate to="/dashboard" replace />;
  }
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
  const { isNative, isMobileWeb } = usePlatform();
  const { videoEnabled, isVideoPlaying, dimOverlay } = useAmbient();
  const showVideo = videoEnabled && !isNative; // Trên Native App tắt video nền để tiết kiệm pin và đạt 120 FPS
  const { isDarkMode } = useTheme();
  const videoRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, openAuthModal, authModalOpen, closeAuthModal } = useAuth();
  const isStudioMode = /^\/(dictation|shadowing|speaking|writing|reading|tenses|vocabularies|mock-tests)\/[^/]+$/.test(location.pathname) ||
    /^\/(practice|my-vocabulary\/review)/.test(location.pathname);

  // Native Android Capacitor Lifecycle & Hardware Back Button Handling
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backListenerPromise = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      } else if (authModalOpen) {
        closeAuthModal?.();
      } else if (canGoBack && location.pathname !== '/dashboard' && location.pathname !== '/') {
        navigate(-1);
      } else {
        CapApp.exitApp();
      }
    });

    const stateListenerPromise = CapApp.addListener('appStateChange', ({ isActive }) => {
      const video = videoRef.current;
      if (!video) return;
      if (!isActive) {
        video.pause();
      } else if (videoEnabled && isVideoPlaying) {
        video.play().catch(() => {});
      }
    });

    return () => {
      backListenerPromise.then((handle) => handle.remove()).catch(() => {});
      stateListenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [isMobileMenuOpen, authModalOpen, closeAuthModal, location.pathname, navigate, videoEnabled, isVideoPlaying]);

  // Auto-open Auth modal when guest visits /login, /register, or /forgot-password
  useEffect(() => {
    if (!user) {
      if (location.pathname === '/login') {
        openAuthModal('login');
      } else if (location.pathname === '/register') {
        openAuthModal('signup');
      } else if (location.pathname === '/forgot-password') {
        openAuthModal('forgot');
      }
    }
  }, [location.pathname, user, openAuthModal]);

  // Global event listener to open auth modal from anywhere (e.g. AI requests, guest clicks)
  useEffect(() => {
    const handleOpenAuth = (e) => {
      openAuthModal?.(e.detail?.mode || 'login');
    };
    window.addEventListener('auth-modal:open', handleOpenAuth);
    return () => window.removeEventListener('auth-modal:open', handleOpenAuth);
  }, [openAuthModal]);

  // Sync video play/pause with user controls
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (videoEnabled && isVideoPlaying && !document.hidden) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [videoEnabled, isVideoPlaying]);

  // Pause video automatically when user switches browser tab or minimizes window
  useEffect(() => {
    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (!video) return;

      if (document.hidden) {
        video.pause();
      } else {
        if (videoEnabled && isVideoPlaying) {
          video.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [videoEnabled, isVideoPlaying]);

  return (
    <div className={`relative flex min-h-screen text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 ${
      showVideo ? 'bg-transparent' : 'bg-slate-50/70 dark:bg-[#090a0f]'
    }`}>
      {/* Global Background Video with Liquid Glass Layering */}
      {showVideo && (
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden transform-gpu" style={{ contain: 'strict' }} aria-hidden="true">
          <video
            ref={videoRef}
            src="/assets/videos/1027.mp4"
            autoPlay={showVideo && isVideoPlaying}
            loop
            muted
            playsInline
            preload="auto"
            className="h-full w-full object-cover select-none pointer-events-none"
            style={{
              transform: 'scale(1.02) translate3d(0, 0, 0)',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
            }}
          />
          {/* Ambient Overlay: Fixed subtle dimming in dark mode, crystal clear in light mode */}
          <div
            className="absolute inset-0 transition-colors duration-500 pointer-events-none"
            style={{
              backgroundColor: isDarkMode ? `rgba(9, 10, 15, ${dimOverlay || 0.35})` : 'transparent',
            }}
          />
        </div>
      )}

      {/* Fallback ambient glows when video is disabled (Always on Native App for 120 FPS & battery saving) */}
      {!showVideo && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-500/10 dark:hidden blur-3xl" />
          <div className="absolute top-1/3 -left-20 w-80 h-80 rounded-full bg-violet-400/8 dark:hidden blur-3xl" />
          <div className="absolute -bottom-20 left-10 w-80 h-80 rounded-full bg-sky-400/8 dark:hidden blur-3xl" />
        </div>
      )}

      {/* Sidebar: Chỉ hiển thị trên Web (Desktop/Mobile Web). Ẩn hoàn toàn trên Native App */}
      {!isNative && (
        <Sidebar 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed} 
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
      )}
      
      <div className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${
        isNative
          ? (isStudioMode ? 'w-full pb-0' : 'w-full pb-20')
          : isCollapsed
            ? 'lg:ml-[6.75rem] lg:w-[calc(100%-6.75rem)] w-full'
            : 'lg:ml-[19.25rem] lg:w-[calc(100%-19.25rem)] w-full'
      } ${isStudioMode ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
        <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} hideMenuButton={isNative} />
        <main className={`flex-1 flex flex-col relative min-w-0 ${isStudioMode ? 'overflow-hidden' : 'overflow-x-hidden'}`}>
          <Outlet />
        </main>
        {!isStudioMode && !isNative && <Footer />}
      </div>

      {/* Bottom Navigation Bar: Dành riêng cho Native App APK trên điện thoại & tablet */}
      {isNative && !isStudioMode && <BottomNav />}

      {/* Banner gợi ý tải App APK: Chỉ hiển thị cho người dùng duyệt Web trên Mobile/iPad */}
      {isMobileWeb && <AppDownloadBanner />}

      <Suspense fallback={null}>
        {!isStudioMode && <LearningBotDock />}
        <GlobalDictionary showTrigger={false} />
        <GlobalFeedback showTrigger={false} />
        <AuthModal />
      </Suspense>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<GlobalSkeletonLoader />}>
      <Routes>
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
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Dashboard />} />
          <Route path="/register" element={<Dashboard />} />
          <Route path="/forgot-password" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tflat" element={<TFlat />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/my-vocabulary" element={<PrivateRoute><PersonalVocabulary /></PrivateRoute>} />
          <Route path="/my-vocabulary/review/:index" element={<PrivateRoute><PersonalVocabReview /></PrivateRoute>} />
          <Route path="/subcategories/:mainGroupName" element={<SubCategories />} />
          <Route path="/categories/:id" element={<WordList />} />
          <Route path="/vocabularies/:id" element={<VocabularyDetail />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/games" element={<Games />} />
          {/* <Route path="/kids" element={<KidsZone />} /> */}
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
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
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
          <Route path="levels" element={<AdminLevels />} />
          <Route path="avatar-frames" element={<AdminAvatarFrames />} />
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
