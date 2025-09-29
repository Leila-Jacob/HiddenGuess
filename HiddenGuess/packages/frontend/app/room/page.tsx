import { Suspense } from 'react';
import RoomClient from './RoomClient';

export default function RoomEntryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading room...</div>}>
      <RoomClient />
    </Suspense>
  );
}
