# FounderHQ - A Setique Tool

A comprehensive, production-ready dashboard application built with React and TypeScript for founders to manage their business operations, featuring AI-powered insights, database persistence, and user authentication.

## 🚀 Features

### Core Functionality
- **🔐 User Authentication**: Secure signup/login with Supabase Auth
- **📊 Dashboard Overview**: Daily briefings with key metrics and action items
- **✅ Task Management**: Organize tasks across different business areas
- **👥 CRM System**: Manage investors, customers, and partners with contacts and meetings
- **📈 Marketing Management**: Track campaigns and content creation
- **💰 Financial Tracking**: Monitor MRR, GMV, and other key metrics
- **📁 Document Library**: Store and manage important files
- **🤖 AI Assistant**: Powered by Google Gemini for strategic insights
- **🏆 Achievements & Gamification**: Track progress and maintain motivation
- **📅 Calendar Integration**: View all tasks, meetings, and deadlines

### Production Features
- **🔒 Row-Level Security**: All data is securely isolated per user
- **⚡ Real-time Updates**: Powered by Supabase real-time subscriptions
- **📱 Responsive Design**: Works on desktop, tablet, and mobile
- **🛡️ Error Boundaries**: Graceful error handling and recovery
- **🚀 Performance Optimized**: Code splitting and lazy loading
- **🐳 Docker Support**: Containerized deployment ready
- **📝 Type Safety**: Full TypeScript support with strict types

## 🏗️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for build tooling and development
- **Tailwind CSS** with neo-brutalist design system
- **Recharts** for data visualization
- **React Markdown** with GitHub Flavored Markdown support

### Backend & Database
- **Supabase** for authentication, database, and real-time features
- **PostgreSQL** with Row Level Security (RLS)
- **Google Gemini API** for AI-powered insights

### DevOps & Deployment
- **Docker** containerization
- **Nginx** for production serving
- **Vercel/Netlify** deployment ready
- **Environment-based configuration**

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd setique-founder-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**
   - Create a new Supabase project
   - Run the SQL schema from `supabase/schema.sql` in your Supabase SQL editor
   - Configure Row Level Security policies (included in schema)

5. **Start development server**
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` to see the application.

### Desktop Application

Want to run as a standalone desktop app? See [DESKTOP_APP_QUICKSTART.md](./DESKTOP_APP_QUICKSTART.md)

```bash
# Run as desktop app
npm run electron:dev

# Build installer
npm run electron:build:win  # or :mac or :linux
```

## 📖 Database Setup

The application requires a PostgreSQL database with specific tables and security policies. 

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Run the schema**: Copy the contents of `supabase/schema.sql` and execute it in your Supabase SQL editor
3. **Verify setup**: The schema creates all necessary tables with Row Level Security enabled

### Database Tables
- `profiles` - User profiles and settings
- `tasks` - Task management across categories
- `crm_items` - Companies (investors, customers, partners)
- `contacts` - Individual contacts within companies
- `meetings` - Meeting records with contacts
- `marketing_items` - Marketing campaigns and initiatives  
- `financial_logs` - Financial metrics over time
- `documents` - File storage with metadata

## 🚀 Deployment

### Option 1: Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Option 2: Docker
```bash
# Build image
docker build -t setique-dashboard .

# Run container
docker run -p 3000:80 setique-dashboard
```

### Option 3: Traditional VPS
```bash
# Build for production
npm run build

# Upload dist/ folder to your server
# Configure nginx/apache to serve static files
```

See `DEPLOYMENT.md` for detailed deployment instructions.

## 🧪 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GEMINI_API_KEY` | Google Gemini API key | Yes |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_ENVIRONMENT` | Environment (dev/prod) | No |

## 🔒 Security

- **Authentication**: Powered by Supabase Auth with secure JWT tokens
- **Authorization**: Row Level Security ensures data isolation
- **API Security**: All API keys are properly scoped for client-side use
- **HTTPS**: Enforced in production with security headers
- **CSP**: Content Security Policy configured for XSS protection

## 🤝 Contributing

While this is a personal project, feedback and suggestions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For questions or issues:
1. Check the `DEPLOYMENT.md` for deployment help
2. Review the database schema in `supabase/schema.sql`
3. Open an issue on GitHub

---

Built with ❤️ for solo founders who need to stay organized and focused on what matters most.
