import { useEffect, useState } from 'react';

/**
 * iOS MapKit özel marker görünümlerini sürekli bitmap'e çevirir.
 * tracksViewChanges=true iken her frame snapshot alınır — animasyonlu pinlerde
 * periyodik kısa açılış yeterli; statik pinlerde ilk çizimden sonra kapatılır.
 */
export function useIosMarkerTracksViewChanges(animated: boolean): boolean {
  const [tracks, setTracks] = useState(true);

  useEffect(() => {
    if (!animated) {
      const offTimer = setTimeout(() => setTracks(false), 400);
      return () => clearTimeout(offTimer);
    }

    setTracks(true);
    const pulse = setInterval(() => {
      setTracks(true);
      setTimeout(() => setTracks(false), 220);
    }, 4_000);

    return () => clearInterval(pulse);
  }, [animated]);

  return tracks;
}
