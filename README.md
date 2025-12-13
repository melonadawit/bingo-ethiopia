# 🎰 Bingo Ethiopia

A real-money multiplayer Bingo game platform built specifically for Ethiopian players, featuring local payment integration and traditional Ethiopian game modes.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)

## ✨ Features

### 🎮 Game Modes
- **Ande Zeg** (One Line) - Complete one horizontal line
- **Hulet Zeg** (Two Lines) - Complete two horizontal lines
- **Mulu Zeg** (Full Card) - Complete the entire card

### 💰 Real-Money Gaming
- Secure wallet system with deposit/withdrawal
- Integration with **Chapa** payment gateway (Ethiopian local payment)
- Real-time balance updates
- Transaction history tracking

### 🎯 Multiplayer Features
- Real-time gameplay using WebSocket (Socket.IO)
- Automatic number calling with professional audio
- Live player count and game status
- Winner announcements with celebration animations

### 👥 Social Features
- Referral system with rewards
- Game history and statistics
- Leaderboards (coming soon)
- User profiles and settings

### 🔊 Audio System
- Professional voice announcements for numbers 1-75
- Special audio for "BINGO!" and "Game Starting"
- Amharic language support

## 🏗️ Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **Socket.IO Client** - Real-time communication
- **React Router** - Navigation

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **Socket.IO** - WebSocket server
- **Firebase Admin** - Database and authentication
- **JWT** - Token-based authentication

### Database & Services
- **Firebase Firestore** - NoSQL database
- **Firebase Auth** - User authentication
- **Chapa API** - Payment processing

## 📁 Project Structure

```
bingo-ethiopia/
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── services/      # API and Socket services
│   │   ├── utils/         # Helper functions
│   │   ├── context/       # React context providers
│   │   └── layouts/       # Layout components
│   └── public/
│       └── audio/         # 377 audio files for game
│
├── server/                # Backend application
│   └── src/
│       ├── controllers/   # Request handlers
│       ├── routes/        # API routes
│       ├── services/      # Business logic
│       ├── middleware/    # Auth & validation
│       ├── bot.ts        # Bot system for testing
│       ├── socket.ts     # Socket.IO handlers
│       └── firebase.ts   # Database config
│
└── scripts/              # Utility scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project
- Chapa account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bingo-ethiopia.git
   cd bingo-ethiopia
   ```

2. **Install dependencies**
   ```bash
   # Install client dependencies
   cd client
   npm install

   # Install server dependencies
   cd ../server
   npm install
   ```

3. **Configure environment variables**

   **Client** (`client/.env`):
   ```env
   VITE_API_URL=http://localhost:3000
   ```

   **Server** (`server/.env`):
   ```env
   PORT=3000
   NODE_ENV=development
   
   # Firebase credentials (from Firebase Console)
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY=your-private-key
   FIREBASE_CLIENT_EMAIL=your-client-email
   
   # Chapa credentials (from Chapa Dashboard)
   CHAPA_SECRET_KEY=your-secret-key
   CHAPA_PUBLIC_KEY=your-public-key
   CHAPA_ENCRYPTION_KEY=your-encryption-key
   ```

4. **Run development servers**

   **Terminal 1 - Backend:**
   ```bash
   cd server
   npm run dev
   ```

   **Terminal 2 - Frontend:**
   ```bash
   cd client
   npm run dev
   ```

5. **Open your browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## 🌐 Deployment

This application is configured for deployment on:
- **Frontend**: Vercel
- **Backend**: Render

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🎮 How to Play

1. **Sign Up** - Create an account or log in
2. **Deposit Funds** - Add money to your wallet via Chapa
3. **Join a Game** - Select a game mode and entry fee
4. **Play** - Numbers are called automatically
5. **Win** - Click "BINGO!" when you complete a pattern
6. **Cash Out** - Withdraw your winnings anytime

## 🧪 Bot System

For testing and development, the server includes a bot system:
- Bots automatically join games
- Simulate real player behavior
- Help with load testing
- Can be configured in `server/src/bot.ts`

## 📊 Game Modes Explained

### Ande Zeg (አንድ ዘግ - One Line)
Complete any one horizontal line on your card. Fastest and most common win pattern.

### Hulet Zeg (ሁለት ዘግ - Two Lines)
Complete any two horizontal lines on your card. Moderate difficulty.

### Mulu Zeg (ሙሉ ዘግ - Full Card)
Complete all numbers on your card (full house). Highest prize pool.

## 🔐 Security Features

- JWT-based authentication
- Encrypted environment variables
- Secure payment processing via Chapa
- Input validation and sanitization
- CORS configuration
- Rate limiting (recommended for production)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Chapa for Ethiopian payment processing
- Firebase for backend infrastructure
- The Ethiopian gaming community

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Email: support@bingoethiopia.com (update with your contact)

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] More game variations
- [ ] Tournament mode
- [ ] Chat system
- [ ] Leaderboards
- [ ] Daily challenges
- [ ] Social media integration

---

**Made with ❤️ for Ethiopia** 🇪🇹
