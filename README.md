# TaskMasterPro

A comprehensive task management application built with modern web technologies, featuring real-time collaboration, Google OAuth authentication, and advanced analytics.

## Features

- **Task Management**: Create, edit, delete, and organize tasks with priorities and due dates
- **Real-time Collaboration**: Share tasks with team members and see updates instantly
- **Google OAuth Authentication**: Secure login with your Google account
- **Analytics Dashboard**: Track productivity with visual charts and statistics
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Mode Support**: Toggle between light and dark themes
- **Offline Indicators**: Visual feedback for connection status
- **Advanced Filtering**: Sort and filter tasks by status, priority, and date

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** components for consistent UI
- **TanStack Query** for server state management
- **Wouter** for client-side routing
- **Recharts** for data visualization

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **Passport.js** with Google OAuth 2.0
- **WebSocket** for real-time updates
- **PostgreSQL** with Drizzle ORM

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- Google OAuth 2.0 credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd taskmasterpro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in your environment variables in the `.env` file.

4. **Set up Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
   - Copy the Client ID and Client Secret to your `.env` file

5. **Set up the database**
   ```bash
   npm run db:push
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Yes |
| `SESSION_SECRET` | Secret key for session encryption | Yes |
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Server port (default: 5000) | No |

## Database Schema

The application uses PostgreSQL with the following main tables:

- **users**: Store user profiles from Google OAuth
- **tasks**: Core task entities with status, priority, due dates
- **task_shares**: Many-to-many relationship for task collaboration
- **task_activities**: Audit trail for task changes
- **sessions**: Express session storage

## API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth login
- `GET /api/auth/google/callback` - OAuth callback handler
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/user` - Get current user info

### Tasks
- `GET /api/tasks` - Get user's tasks with filtering
- `GET /api/tasks/:id` - Get specific task
- `POST /api/tasks` - Create new task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Task Sharing
- `POST /api/tasks/:id/share` - Share task with user
- `GET /api/tasks/:id/shares` - Get task shares
- `DELETE /api/tasks/:id/shares/:userId` - Remove task share

### Analytics
- `GET /api/analytics/stats` - Get task statistics
- `GET /api/analytics/productivity` - Get productivity data
- `GET /api/analytics/team` - Get team performance data

## Development

### Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
├── server/                # Backend Express application
│   ├── auth.ts           # Authentication setup
│   ├── db.ts             # Database connection
│   ├── routes.ts         # API routes
│   └── storage.ts        # Database operations
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema and types
└── package.json
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open Drizzle Studio

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Deployment

### Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set up your production database and environment variables

3. Update Google OAuth redirect URI with your production domain:
   `https://your-production-domain.com/api/auth/google/callback`

4. Deploy to your hosting platform of choice

## Security Features

- **Session-based Authentication**: Secure session management with PostgreSQL storage
- **CSRF Protection**: Built-in protection against cross-site request forgery
- **Input Validation**: Comprehensive validation using Zod schemas
- **SQL Injection Prevention**: Using parameterized queries with Drizzle ORM

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue on GitHub or contact the development team.