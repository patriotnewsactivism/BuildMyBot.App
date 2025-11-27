# BuildMyBot.App

<div align="center">
  <img width="1200" height="475" alt="BuildMyBot Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

**BuildMyBot** is a comprehensive platform for creating, managing, and deploying AI-powered chatbots with built-in CRM, marketing tools, and reseller capabilities.

## 🚀 Features

### Core Features
- **Bot Builder** - Create and configure AI chatbots with custom personalities and knowledge bases
- **Live Chat Interface** - Real-time AI conversations with lead capture
- **Lead CRM** - Comprehensive customer relationship management with lead scoring
- **Marketing Tools** - AI-powered content generation for emails, social media, and ads
- **Website Builder** - AI-assisted landing page creation
- **Marketplace** - Browse and install pre-built bot templates
- **Reseller Dashboard** - White-label reseller program with commission tracking
- **Admin Panel** - System monitoring and user management

### Technical Features
- React 18 + TypeScript
- Vite build system
- Firebase (Authentication, Firestore, Storage, Analytics)
- OpenAI GPT-4o Mini integration
- Real-time database subscriptions
- Rate limiting and input sanitization
- Error boundaries and comprehensive error handling
- Docker containerization
- CI/CD with GitHub Actions

## 📋 Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Firebase Account** - [Get started](https://console.firebase.google.com/)
- **OpenAI API Key** - [Get your key](https://platform.openai.com/api-keys)

## 🏃 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd BuildMyBot.App
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual credentials:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-your_openai_api_key
```

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:8080`

### 5. Build for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

## 🧪 Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Type check
npm run type-check
```

## 🐳 Docker Deployment

### Build Docker Image

```bash
docker build -t buildmybot:latest \
  --build-arg VITE_FIREBASE_API_KEY=your_key \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=your_domain \
  --build-arg VITE_FIREBASE_PROJECT_ID=your_project \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET=your_bucket \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id \
  --build-arg VITE_FIREBASE_APP_ID=your_app_id \
  --build-arg VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id \
  --build-arg VITE_OPENAI_API_KEY=your_openai_key \
  .
```

### Run Docker Container

```bash
docker run -d -p 80:80 buildmybot:latest
```

The app will be available at `http://localhost`

## 📁 Project Structure

```
BuildMyBot.App/
├── components/           # React components
│   ├── Admin/           # Admin dashboard
│   ├── Auth/            # Authentication
│   ├── Billing/         # Payment and subscriptions
│   ├── BotBuilder/      # Bot creation and configuration
│   ├── Chat/            # Chat interfaces
│   ├── CRM/             # Lead management
│   ├── ErrorBoundary/   # Error handling
│   ├── Landing/         # Landing pages
│   ├── Layout/          # Layout components
│   ├── Marketing/       # Marketing tools
│   ├── Marketplace/     # Bot templates
│   ├── PhoneAgent/      # Phone integration (stub)
│   ├── Reseller/        # Reseller dashboard
│   ├── Settings/        # User settings
│   └── WebsiteBuilder/  # Website generation
├── services/            # Backend services
│   ├── dbService.ts     # Firestore operations
│   ├── firebaseConfig.ts # Firebase initialization
│   └── geminiService.ts # OpenAI API integration
├── utils/               # Utility functions
│   ├── rateLimiter.ts   # API rate limiting
│   └── sanitization.ts  # Input sanitization (XSS prevention)
├── .env.example         # Environment variables template
├── .env.local           # Local environment (not in git)
├── Dockerfile           # Docker configuration
├── nginx.conf           # Nginx web server config
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite build configuration
├── vitest.config.ts     # Testing configuration
└── types.ts             # TypeScript type definitions
```

## 🔒 Security

### Implemented Security Measures

1. **Environment Variables** - All sensitive credentials stored in `.env.local` (not in git)
2. **Input Sanitization** - DOMPurify for XSS prevention
3. **Rate Limiting** - Client-side API request limiting
4. **Error Boundaries** - Graceful error handling
5. **Security Headers** - CSP, X-Frame-Options, X-XSS-Protection via nginx
6. **Multi-tenancy** - Database queries filtered by user ID
7. **Type Safety** - TypeScript strict mode

### Security Checklist Before Launch

- [ ] Rotate all API keys if they were previously committed
- [ ] Enable Firebase security rules for Firestore/Storage
- [ ] Set up proper CORS configuration
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure Content Security Policy
- [ ] Set up monitoring and logging
- [ ] Enable Firebase App Check
- [ ] Review and test all authentication flows

## 🌐 Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password provider)
3. Create a Firestore database
4. Create Storage bucket
5. Get your configuration from Project Settings
6. Update `.env.local` with your Firebase credentials

### Firestore Collections Structure

```
/users/{userId}
  - id: string
  - email: string
  - role: 'free' | 'pro' | 'enterprise' | 'partner' | 'admin'
  - plan: 'free' | 'starter' | 'professional' | 'enterprise'

/bots/{botId}
  - id: string
  - name: string
  - ownerId: string (references /users/{userId})
  - systemPrompt: string
  - knowledgeBase: string
  - model: string
  - createdAt: number

/leads/{leadId}
  - id: string
  - name: string
  - email: string
  - botId: string
  - botOwnerId: string (for multi-tenancy)
  - status: string
  - score: number
  - createdAt: number

/conversations/{conversationId}
  - id: string
  - botId: string
  - messages: array
  - timestamp: number
```

### Firestore Security Rules (Recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Users can only read/write their own bots
    match /bots/{botId} {
      allow read, write: if request.auth.uid == resource.data.ownerId;
      allow create: if request.auth.uid == request.resource.data.ownerId;
    }

    // Users can only read/write leads they own
    match /leads/{leadId} {
      allow read, write: if request.auth.uid == resource.data.botOwnerId;
      allow create: if request.auth.uid == request.resource.data.botOwnerId;
    }

    // Anyone can create conversations (public bots)
    match /conversations/{convId} {
      allow read, write: if true;
    }
  }
}
```

## 🚀 CI/CD

GitHub Actions workflow is configured in `.github/workflows/ci.yml`

### Required GitHub Secrets

Add these secrets in your GitHub repository settings:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
VITE_OPENAI_API_KEY
DOCKER_USERNAME (if using Docker Hub)
DOCKER_PASSWORD (if using Docker Hub)
```

## 📦 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server on port 8080 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run type-check` | Check TypeScript types |

## 🔧 Configuration

### Vite Configuration

Port, build options, and plugins configured in `vite.config.ts`

### TypeScript Configuration

Strict mode enabled in `tsconfig.json` for better type safety

### Rate Limiting

Configure rate limits in `utils/rateLimiter.ts`:

- AI Chat: 20 requests/minute
- Marketing: 10 requests/minute
- Website Generation: 5 requests/minute

## 🐛 Troubleshooting

### Build Errors

**Error: Firebase config is undefined**
- Ensure all VITE_FIREBASE_* variables are set in `.env.local`
- Variables must start with `VITE_` to be accessible in the app

**Error: OpenAI API key missing**
- Add `VITE_OPENAI_API_KEY` to `.env.local`

### Runtime Errors

**Error: Rate limit exceeded**
- Wait 60 seconds and try again
- Adjust rate limits in `utils/rateLimiter.ts` if needed

**Error: Permission denied (Firestore)**
- Check Firestore security rules
- Ensure user is authenticated
- Verify ownerId matches current user

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## 📄 License

Proprietary - All rights reserved

## 🤝 Contributing

This is a private project. For questions or issues, please contact the development team.

## 📧 Support

For support, email: support@buildmybot.app

---

Built with ❤️ using React, TypeScript, and Firebase
