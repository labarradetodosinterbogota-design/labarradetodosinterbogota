# Inter Bogotá Barra Popular Platform

A comprehensive web application for the Inter Bogotá supporters group ("barra popular"). This platform brings together members of the community with features for voting, documentation, member management, and community engagement—all built on principles of non-violence, transparency, and democratic decision-making.

## ✨ Key Features

### 🌐 Public Module
- Attractive landing page showcasing group values
- History and story of the supporters movement
- Searchable chants library with audio/video support
- Public calendar of matches and events
- Open access to view group information

### 🔒 Private Module (Members Only)
- Member dashboard with quick links
- Members directory for networking
- Digital membership cards with QR codes
- Democratic voting on group decisions
- Access to official documentation
- Discussion forum for community engagement
- Event attendance tracking

### ⚙️ Admin Module (Leadership Only)
- Comprehensive admin dashboard
- Member and role management
- Chant and document uploads
- Voting poll creation and management
- Inventory tracking for flags and instruments
- Community moderation tools

## 🚀 Technology Stack

- **React 18+** - Modern UI framework
- **Vite** - Lightning-fast build tool
- **TypeScript** - Type-safe development
- **TailwindCSS** - Beautiful utility-first styling
- **Supabase** - Backend as a service with PostgreSQL
- **React Query** - Server state management
- **React Router v6** - Client-side routing
- **React Hook Form** - Efficient form handling

## 📋 Project Structure

```
src/
├── components/
│   ├── atoms/           # Button, Input, Badge, Avatar, etc.
│   ├── molecules/       # Cards, SearchBar, Modal, etc.
│   ├── organisms/       # Navigation, complex sections
│   └── templates/       # Page layouts
├── pages/
│   ├── public/          # Home, History, Chants, Calendar
│   ├── private/         # Dashboard, Members, Voting, Documents
│   ├── auth/            # Login, Register
│   └── admin/           # Admin Dashboard
├── services/            # API calls and business logic
├── hooks/               # Custom React hooks
├── context/             # Global state (Auth)
├── types/               # TypeScript definitions
└── router.tsx           # Route configuration
```

## 🎨 Design System

### Brand Colors
- **Gold (#C49F65)**: Primary action color, greatness
- **Dark Gray (#24221F)**: Professional, strength
- **White (#FFFFFF)**: Clean, unity

### Responsive Design
- Mobile-first approach
- Breakpoints: sm, md, lg
- Touch-friendly on all devices
- Works in stadium environments

## 🔐 Security

- **Row Level Security (RLS)**: Database-level access control
- **Role-Based Access**: basic_user vs coordinator_admin
- **Protected Routes**: Frontend route protection
- **Secure Authentication**: Supabase email/password auth
- **Encrypted Storage**: Files stored in Supabase Storage

## 📦 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
# Create/update .env file with Supabase credentials
# VITE_SUPABASE_URL=your_url
# VITE_SUPABASE_ANON_KEY=your_key

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📖 Documentation

See [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) for:
- Complete feature overview
- Database schema details
- Service and hook documentation
- Security considerations
- Deployment instructions
- Future enhancement plans

## 🗺️ Routes

### Public Routes
- `/` - Home page
- `/history` - Group history
- `/chants` - Chants library
- `/calendar` - Event calendar
- `/login` - Login page
- `/register` - Registration page

### Private Routes (Authentication Required)
- `/dashboard` - Member dashboard
- `/members` - Members directory
- `/voting` - Voting polls
- `/documents` - Official documents
- `/forum` - Discussion forum
- `/membership-card` - Digital card

### Admin Routes (Admin Only)
- `/admin` - Admin dashboard

## 🔄 State Management

### React Context
- **AuthContext**: Handles authentication state and user data

### React Query
- Automatic caching and synchronization
- Pagination support built-in
- Real-time updates across components
- Efficient server state management

## 🎯 Core Values

✅ **No Violence**: Zero tolerance policy
✅ **Democratic**: Every member has a voice in decisions
✅ **Transparent**: Open documentation and decision-making
✅ **Inclusive**: Welcome all supporters regardless of background
✅ **Collaborative**: Together we are stronger

## 📊 Database Schema

### Key Tables
- **users** - User accounts with roles
- **member_profiles** - Extended member info
- **voting_polls** - Democratic voting system
- **chants** - Supporter chants library
- **events_calendar** - Match and event calendar
- **documents** - Official documentation
- **flags_instruments** - Inventory tracking
- **forum_posts** - Community discussions

All tables include:
- Automatic timestamps
- Row Level Security (RLS)
- Role-based access control
- Proper constraints and indexes

## 🚢 Deployment

The application is ready for deployment to any modern hosting:
- Vercel
- Netlify
- AWS
- Google Cloud
- Azure
- Docker containers

## 📱 Browser Support

- Chrome/Edge (Latest)
- Firefox (Latest)
- Safari (Latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

Contributions are welcome! Areas for enhancement:
- Additional feature implementations
- Performance optimizations
- Documentation improvements
- Bug fixes and testing

## 📞 Support

For issues, questions, or feature requests:
1. Check the project documentation
2. Review existing database schema
3. Check component implementation examples
4. Verify Supabase configuration

## 📝 License

This project is created for the Inter Bogotá supporters community.

## 🎉 Acknowledgments

Built with modern web technologies and best practices in mind. This platform embodies the values of the Inter Bogotá barra popular: unity, transparency, and democratic decision-making.

---

**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: 2024
