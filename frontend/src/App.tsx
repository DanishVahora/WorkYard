import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import './styles/PageScaffold.css'
import Navbar from './layout/Navbar'
import NotificationToaster from './components/NotificationToaster'
import HomePage from './pages/HomePage'
import ExplorePage from './pages/ExplorePage'
import AboutPage from './pages/AboutPage'
import SignupPage from './authPages/SignupPage'
import LoginPage from './authPages/LoginPage'
import FeedPage from './pages/FeedPage'
import AddProjectPage from './pages/AddProjectPage'
import SavedPage from './pages/SavedPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import ProtectedRoute from './components/ProtectedRoute'
import ProjectDetailPage from './pages/ProjectDetailPage'
import EditProjectPage from './pages/EditProjectPage'
import PeoplePage from './pages/PeoplePage'
import UserProfilePage from './pages/UserProfilePage'
import MessagesPage from './pages/MessagePage'

function App() {
  return (
    <>
      <Navbar />
      <NotificationToaster />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <FeedPage />
            </ProtectedRoute>
          }
        />
        {/* <Route
          path="/people"
          element={
            <ProtectedRoute>
              <PeoplePage />
            </ProtectedRoute>
          }
        /> */}
        <Route
          path="/projects/new"
          element={
            <ProtectedRoute>
              <AddProjectPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id/edit"
          element={
            <ProtectedRoute>
              <EditProjectPage />
            </ProtectedRoute>
          }
        />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route
          path="/users/:id"
          element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/saved"
          element={
            <ProtectedRoute>
              <SavedPage />
            </ProtectedRoute>
          }
        />
        {/* <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        /> */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
