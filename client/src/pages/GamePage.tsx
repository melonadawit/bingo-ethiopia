
import React from 'react';

const GamePage: React.FC = () => {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Game Room</h1>
            <div className="grid grid-cols-5 gap-4 max-w-md mx-auto">
                {/* Placeholder for Bingo Board */}
                {Array.from({ length: 25 }).map((_, i) => (
                    <div key={i} className="w-12 h-12 bg-white border flex items-center justify-center font-bold">
                        {i + 1}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GamePage;
