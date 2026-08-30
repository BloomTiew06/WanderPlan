import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './components/Layout';
import { Notice } from './components/ui';
import { useStore } from './store/store';

import Home from './screens/Home';
import NewTrip from './screens/NewTrip';
import BestTime from './screens/BestTime';
import Invite from './screens/Invite';
import Availability from './screens/Availability';
import Quiz from './screens/Quiz';
import Waiting from './screens/Waiting';
import Itinerary from './screens/Itinerary';
import Group from './screens/Group';
import Social from './screens/Social';
import Stays from './screens/Stays';
import Budget from './screens/Budget';
import Spending from './screens/Spending';
import Language from './screens/Language';
import CheckIns from './screens/CheckIns';
import Recap from './screens/Recap';
import MyMap from './screens/MyMap';
import Passport from './screens/Passport';
import Profile from './screens/Profile';
import Join from './screens/Join';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<NewTrip />} />
        <Route path="/join/:code" element={<Join />} />

        <Route path="/setup/:tripId/best-time" element={<BestTime />} />
        <Route path="/setup/:tripId/invite" element={<Invite />} />
        <Route path="/setup/:tripId/dates" element={<Availability />} />
        <Route path="/setup/:tripId/quiz" element={<Quiz />} />
        <Route path="/setup/:tripId/waiting" element={<Waiting />} />

        <Route path="/trip/:tripId" element={<TripLayout />}>
          <Route index element={<Navigate to="itinerary" replace />} />
          <Route path="itinerary" element={<Itinerary />} />
          <Route path="group" element={<Group />} />
          <Route path="social" element={<Social />} />
          <Route path="stays" element={<Stays />} />
          <Route path="budget" element={<Budget />} />
          <Route path="spending" element={<Spending />} />
          <Route path="language" element={<Language />} />
          <Route path="checkins" element={<CheckIns />} />
          <Route path="recap" element={<Recap />} />
        </Route>

        <Route path="/map" element={<MyMap />} />
        <Route path="/passport" element={<Passport />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/r/:tripId" element={<PublicRecap />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

/**
 * Trip routes share one loaded trip, handed to children via outlet context so
 * every tab reads the same object without re-looking it up.
 */
function TripLayout() {
  const { tripId } = useParams();
  const { state, setActiveTrip } = useStore();
  const trip = state.trips.find((t) => t.id === tripId);

  useEffect(() => {
    if (trip && state.activeTripId !== trip.id) setActiveTrip(trip.id);
  }, [trip?.id, state.activeTripId]);

  if (!trip) {
    return <Notice tone="warn">That trip no longer exists. Head back to your trips.</Notice>;
  }
  return <Outlet context={trip} />;
}

/**
 * The shareable recap link: read-only, no auth, viewable in a browser by
 * someone who has never installed anything.
 */
function PublicRecap() {
  const { tripId } = useParams();
  const { state, setActiveTrip } = useStore();
  const navigate = useNavigate();
  const trip = state.trips.find((t) => t.id === tripId);

  useEffect(() => {
    if (trip) {
      setActiveTrip(trip.id);
      navigate(`/trip/${trip.id}/recap`, { replace: true });
    }
  }, [trip?.id]);

  if (!trip) return <Notice tone="warn">That recap link isn't valid.</Notice>;
  return null;
}
