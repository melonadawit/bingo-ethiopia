import UserProfilePage from "./client-page";

// Force static generation only for returned paths
export const dynamicParams = false;

export async function generateStaticParams() {
    return [{ id: 'demo' }];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <UserProfilePage params={{ id }} />;
}
