
import React from 'react';

const HomePage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-4xl font-bold mb-4">Bingo Ethiopia</h1>
            <p className="text-lg mb-8">Play Real-Money Bingo in Ethiopia!</p>
            <div className="space-x-4">
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Login</button>
                <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Register</button>
            </div>
        </div>
    );
};

export default HomePage;
