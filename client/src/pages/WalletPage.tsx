
import React from 'react';

const WalletPage: React.FC = () => {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">My Wallet</h1>
            <div className="bg-white p-4 rounded shadow mb-4">
                <h2 className="text-xl">Balance: 0.00 ETB</h2>
            </div>
            <div className="space-x-4">
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Deposit</button>
                <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Withdraw</button>
            </div>
        </div>
    );
};

export default WalletPage;
