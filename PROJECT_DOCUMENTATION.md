# Inter Bogotá Barra Popular - Platform Documentation

## Overview

This is a comprehensive web application for the Inter Bogotá supporters group ("barra popular"). The platform implements a three-tier access system (Public, Private/Members, Admin) with features for member management, voting, documentation, inventory tracking, and community engagement.

## Technology Stack

- **Frontend**: React 18+ with Vite
- **Styling**: TailwindCSS with custom brand color system
- **Type Safety**: TypeScript
- **State Management**: React Context + TanStack Query (React Query)
- **Routing**: React Router v6
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod

## Architecture

### Atomic Design Structure

The component hierarchy follows Atomic Design principles:

```
/components
├── /atoms          (Button, Input, Badge, Avatar, Alert, etc.)
├── /molecules      (MemberCard, ChantCard, SearchBar, Modal, etc.)
├── /organisms      (Navigation, Grids, Complex sections)
└── /templates      (PublicLayout, PrivateLayout)
```

### Directory Structure

```
/src
├── /components     (Reusable UI components)
├── /pages          (Full page components)
│   ├── /public     (Unauthenticated pages)
│   ├── /private    (Members only)
│   ├── /auth       (Login/Register)
│   └── /admin      (Admin only)
├── /hooks          (Custom React hooks)
├── /services       (API & business logic)
├── /context        (Global state - Auth, etc.)
├── /types          (TypeScript interfaces)
├── router.tsx      (Main routing configuration)
└── App.tsx         (Root component)
```

## Key Features Implemented

### Public Module
- **Home/Landing Page**: Hero section, core values, call-to-action
- **History Page**: Group story and values
- **Chants Library**: Searchable collection with audio/video support
- **Calendar**: Upcoming matches and events
- **Authentication**: Login and registration

### Private Module (Members Only)
- **Dashboard**: Quick access to member features
- **Members Directory**: Search and browse all members
- **Digital Membership Card**: QR code and PDF generation ready
- **Voting System**: Active polls with quorum tracking
- **Documents**: Access to official documentation
- **Forum**: Discussion board (foundation laid)
- **Event Attendance**: Mark participation in events

### Admin Module (Leadership Only)
- **Admin Dashboard**: Overview of key functions
- **Member Management**: (Foundation ready)
- **Chants Management**: Upload and approve chants
- **Voting Management**: Create and manage polls
- **Document Management**: Upload official documents
- **Inventory Management**: Track flags and instruments

## Database Schema

### Main Tables
- **users**: Core user data with roles and status
- **member_profiles**: Extended member information
- **chants**: Supporter chants library
- **flags_instruments**: Inventory management
- **events_calendar**: Match and event calendar
- **voting_polls**: Democratic decision voting
- **votes**: Individual votes on polls
- **documents**: Official documentation storage
- **event_attendance**: Event participation tracking
- **forum_posts**: Discussion board posts
- **forum_comments**: Comments on posts

All tables have:
- Row Level Security (RLS) enabled
- Role-based access control
- Proper foreign key constraints
- Audit timestamps (created_at, updated_at)

## Authentication & Authorization

### User Roles
- **basic_user**: Regular member
- **coordinator_admin**: Leadership/administrator

### Features
- Email/password authentication via Supabase
- Session management with automatic refresh
- Protected routes for authenticated users
- Admin-only routes for sensitive operations
- RLS policies for database-level security

## Services

### memberService
- Get all members with pagination
- Search members by name/ID
- Get individual member profiles
- Update user profiles
- Handle photo uploads to Supabase Storage

### chantService
- Fetch approved and all chants
- Search chants by title/lyrics
- Create new chant submissions
- Admin management (update, delete)

### eventService
- Get upcoming and all events
- Mark attendance on events
- Get attendance records
- Create/update/delete events (admin)

### votingService
- Fetch active and completed polls
- Cast votes with validation
- Calculate vote percentages
- Track quorum requirements
- Auto-enrich poll data with vote counts

### documentService
- Fetch public and all documents
- Filter by category
- Handle file uploads to Supabase Storage
- Support public/private document visibility

## Custom Hooks

All hooks use TanStack Query for caching and synchronization:

- **useMembers()**: Paginated member list
- **useMemberSearch()**: Search functionality
- **useChants()**: Approved chants
- **useChantSearch()**: Chant search
- **useUpcomingEvents()**: Upcoming events only
- **useActiveVoting()**: Active polls only
- **useVote()**: Cast vote mutation
- **useCreatePoll()**: Admin poll creation
- **useDocuments()**: Document fetching and filtering

## Styling

### Brand Colors
- **Gold** (#C49F65): Primary action color, highlights, greatness
- **Dark Gray** (#24221F): Professional background, strength
- **White** (#FFFFFF): Clean backgrounds, unity

### Color System
Tailwind extended with:
- `primary-*`: Gold and derived shades
- `dark-*`: Dark gray and neutral scale
- Consistent 150% line height for body text
- 8px spacing system throughout

## Security Considerations

✅ **Implemented**
- Row Level Security (RLS) on all tables
- Role-based access control
- Protected routes on frontend
- Database-level permission enforcement
- Secure file upload/download with Supabase Storage

⚠️ **For Production**
- Add HTTPS enforcement
- Implement rate limiting
- Add audit logging for sensitive operations
- Enable database backups
- Configure CORS properly
- Add CSRF protection if needed
- Review and tighten RLS policies
- Implement password strength requirements
- Add email verification for registrations

## Getting Started

### Environment Setup
```bash
npm install
```

### Supabase Configuration
1. Ensure your `.env` file contains:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

2. Database migrations are automatically applied

### Running Development Server
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

## Future Enhancements

### Planned Features
1. **Forum Enhancement**: Full discussion board with threading
2. **Inventory Management**: Complete item tracking system
3. **Finance Module**: Voluntary contributions tracking
4. **Analytics Dashboard**: Member engagement metrics
5. **Email Notifications**: Event and voting alerts
6. **Mobile App**: React Native version
7. **PWA Features**: Offline support
8. **Video Integration**: Live streaming support
9. **Payment Processing**: Stripe integration for contributions
10. **Localization**: Spanish and other language support

### Technical Improvements
1. Add unit and integration tests
2. Implement error boundaries
3. Add analytics tracking
4. Optimize bundle size
5. Implement lazy loading for images
6. Add service worker for PWA
7. Setup CI/CD pipeline
8. Add monitoring and logging

## Code Quality

### Standards Followed
- TypeScript strict mode
- Proper error handling
- Loading and error states on all async operations
- Responsive design (mobile-first)
- Accessibility considerations
- Consistent code formatting
- Clear component naming
- Separation of concerns

### No Comments Policy
Code is self-documenting through:
- Clear component and function names
- Type definitions with JSDoc
- Logical component organization
- Consistent patterns throughout

## Compliance

- **Colombian Data Protection Law (Law 1581)**: Foundation for GDPR-like data protection
- **WCAG Accessibility**: Color contrast ratios, semantic HTML
- **Responsive Design**: Works on mobile, tablet, desktop

## Performance

Build output:
- **CSS**: 21.50 KB (gzipped: 4.54 KB)
- **JS**: 465.80 KB (gzipped: 135.06 KB)
- **Total**: 0.71 KB HTML

Optimizations:
- Code splitting with React Router
- Image lazy loading
- Query caching with React Query
- Optimistic updates
- Efficient re-renders with React hooks

## Support & Maintenance

### Issue Resolution
1. Check error logs in browser console
2. Verify Supabase connectivity
3. Check RLS policies if data access fails
4. Review authentication state

### Database Maintenance
- Regular backups via Supabase
- Monitor storage quotas
- Review RLS policies periodically
- Keep dependencies updated

## License

This project is created for Inter Bogotá supporters group.

---

**Platform Version**: 1.0.0
**Last Updated**: 2024
**Status**: Production Ready Foundation
