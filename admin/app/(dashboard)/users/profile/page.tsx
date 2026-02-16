'use client';

import { useSearchParams } from 'next/navigation';
import UserProfilePage from "./client-page";
import { Suspense } from 'react';

function ProfileContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    if (!id) {
        return <div className="p-8 text-center text-white/30">No User ID provided.</div>;
    }

    return <UserProfilePage params={{ id }} />;
}

export default function Page() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-white/30">Loading Profile...</div>}>
            <ProfileContent />
        </Suspense>
    );
}
