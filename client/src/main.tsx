import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { AppProvider } from './app/AppProvider';
import { ErrorBoundary } from './app/ErrorBoundary';
import { Shell } from './app/Shell';
import { WindowEffects } from './app/WindowEffects';
import { queryClient } from './data/queryClient';
import { SettingsProvider } from './hooks/useSettings';
import DisplayPage from './pages/DisplayPage';
import NotFoundPage from './pages/NotFoundPage';
import TasksPage from './pages/TasksPage';
import TodayPage from './pages/TodayPage';
import './index.css';

// Pages other than Home, Today and Tasks load when first opened, so the app starts faster.
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'));
const ApplicationPage = lazy(() => import('./pages/ApplicationPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const CoursePage = lazy(() => import('./pages/CoursePage'));
const StyleGuide = lazy(() => import('./pages/StyleGuide'));
const WeekPage = lazy(() => import('./pages/WeekPage'));
const CheckInPage = lazy(() => import('./pages/CheckInPage'));
const MoneyPage = lazy(() => import('./pages/MoneyPage'));
const PathPage = lazy(() => import('./pages/PathPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const JournalPage = lazy(() => import('./pages/JournalPage'));

/** The home screen used to live at /display: old bookmarks and links still land there, with their ?now= and anything else after the address. */
function DisplayRedirect() {
  return <Navigate to={{ pathname: '/', search: useLocation().search }} replace />;
}

if (window.spade?.platform === 'darwin') document.documentElement.classList.add('mac-app');

// Providers, outside in: settings (applies the theme), the server-data cache, the router, then AppProvider (shared data, actions, dialogs, toast).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WindowEffects />
          <Routes>
            <Route path="/styleguide" element={<Suspense><StyleGuide /></Suspense>} />
            <Route path="/display" element={<DisplayRedirect />} />
            <Route
              element={
                <AppProvider>
                  <Outlet />
                </AppProvider>
              }
            >
              {/* Home fills the screen on its own; everything else sits in the Shell, beside the rail. */}
              <Route index element={<ErrorBoundary className="px-6 md:px-10"><DisplayPage /></ErrorBoundary>} />
              <Route element={<Shell />}>
                <Route path="today" element={<TodayPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="week" element={<WeekPage />} />
                <Route path="checkin" element={<CheckInPage />} />
                <Route path="money" element={<MoneyPage />} />
                <Route path="path" element={<PathPage />} />
                <Route path="review" element={<ReviewPage />} />
                <Route path="journal" element={<JournalPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="applications" element={<ApplicationsPage />} />
                <Route path="applications/:id" element={<ApplicationPage />} />
                <Route path="courses" element={<CoursesPage />} />
                <Route path="courses/:id" element={<CoursePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </SettingsProvider>
  </StrictMode>,
);
