# Bingo Ethiopia - Client

Frontend application for Bingo Ethiopia, built with React, TypeScript, and Vite.

## 🚀 Quick Start

### Development
```bash
npm install
npm run dev
```

Visit http://localhost:5173

### Build for Production
```bash
npm run build
```

Output will be in the `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

## 📦 Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS
- **Framer Motion** - Animation library
- **Socket.IO Client** - Real-time communication
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **React Hot Toast** - Toast notifications

## 🎨 Project Structure

```
src/
├── components/          # Reusable components
│   ├── game/           # Game-specific components
│   └── ui/             # Generic UI components
├── pages/              # Route pages
│   ├── Game.tsx        # Main game page
│   ├── Lobby.tsx       # Game lobby
│   ├── Wallet.tsx      # Wallet management
│   ├── Settings.tsx    # User settings
│   ├── History.tsx     # Game history
│   └── ReferralPage.tsx # Referrals
├── services/           # API and Socket services
│   ├── api.ts          # HTTP API calls
│   ├── socket.ts       # Socket.IO client
│   └── audio.ts        # Audio management
├── utils/              # Helper functions
│   └── bingoLogic.ts   # Game logic
├── context/            # React contexts
├── layouts/            # Layout components
├── App.tsx             # Main app component
└── main.tsx            # Entry point
```

## 🔊 Audio Files

The `public/audio/` directory contains:
- 75 MP3 files for number calls (1-75)
- Special announcements (BINGO!, Game Starting)
- Total: 377 audio files

## 🌐 Environment Variables

Create a `.env` file:

```env
# API endpoint
VITE_API_URL=http://localhost:3000

# For production:
# VITE_API_URL=https://your-api-domain.com
```

## 🎮 Key Features

### Game Components
- **BingoCard** - Interactive bingo card with daubing
- **NumberDisplay** - Current and recently called numbers
- **GameControls** - Game actions and status
- **WinnerAnnouncement** - Celebration screen

### Services
- **API Service** - RESTful API calls for auth, wallet, games
- **Socket Service** - Real-time game events
- **Audio Service** - Number calling and sound effects

### Pages
- **Lobby** - Browse and join games
- **Game** - Live gameplay
- **Wallet** - Deposits, withdrawals, balance
- **Settings** - User preferences
- **History** - Past games and stats

## 🔧 Development

### Available Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

This project uses:
- ESLint for code linting
- TypeScript for type checking
- Prettier (recommended)

### TypeScript Configuration

The project uses three TypeScript configs:
- `tsconfig.json` - Base config
- `tsconfig.app.json` - App-specific settings
- `tsconfig.node.json` - Node/Vite config

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables:
   - `VITE_API_URL` - Your backend API URL
3. Deploy!

Vercel will automatically:
- Install dependencies
- Run `npm run build`
- Deploy the `dist/` folder

### Other Platforms

Build the project and deploy the `dist/` folder to any static hosting:

```bash
npm run build
# Upload dist/ to your hosting provider
```

## 🐛 Troubleshooting

### Build Fails
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

### Dev Server Issues
- Check if port 5173 is available
- Try a different port: `npm run dev -- --port 3001`

### TypeScript Errors
- Run type checking: `npx tsc --noEmit`
- Check `tsconfig.*.json` configurations

### Socket Connection Issues
- Verify `VITE_API_URL` is set correctly
- Check if backend server is running
- Check browser console for errors

## 📚 Learn More

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [Socket.IO Client Docs](https://socket.io/docs/v4/client-api/)

## 🤝 Contributing

See the main [README](../README.md) for contribution guidelines.
