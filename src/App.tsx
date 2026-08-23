import { useState, useEffect } from 'react';
import { Home } from './pages/Home';
import { ClosetConfigurator } from './pages/ClosetConfigurator';
import { KitchenConfigurator } from './pages/KitchenConfigurator';
import { SpecialFurnitureConfigurator } from './pages/SpecialFurnitureConfigurator';
import { SipHouseConfigurator } from './pages/SipHouseConfigurator';

export default function App() {
  const [route, setRoute] = useState<'home' | 'closet' | 'kitchen' | 'special' | 'sip-house'>('home');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ar') === 'true' || params.get('config')) {
      setRoute('closet');
    }
  }, []);

  return (
    <>
      {route === 'home' && <Home onNavigate={setRoute} />}
      {route === 'closet' && <ClosetConfigurator onNavigate={() => setRoute('home')} />}
      {route === 'kitchen' && <KitchenConfigurator onNavigate={() => setRoute('home')} />}
      {route === 'special' && <SpecialFurnitureConfigurator onNavigate={() => setRoute('home')} />}
      {route === 'sip-house' && <SipHouseConfigurator onNavigate={() => setRoute('home')} />}
    </>
  );
}
