import { ReferralSystem } from '../components/referral/ReferralSystem';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ReferralPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#1a1b2e] text-white p-4 flex flex-col">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft />
                </button>
                <h1 className="text-xl font-bold">Refer & Earn</h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
                <ReferralSystem />
            </div>
        </div>
    );
};

export default ReferralPage;
