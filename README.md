# Teacher Portal

A comprehensive teacher management system built with React and Vite, designed for educational institutions to manage students, classes, attendance, and academic records.

## Features

### Core Functionality
- **Authentication System** - Secure login/logout with user session management
- **Dashboard** - Overview of classes, students, and key metrics
- **Student Management** - Add, edit, and manage student records
- **Class Management** - Create and organize classes
- **Profile Management** - Update teacher profiles and preferences

### User Interface
- **Responsive Design** - Works on desktop and mobile devices
- **Multi-language Support** - English and Khmer language support
- **Modern UI Components** - Built with Radix UI and Tailwind CSS
- **Loading States** - Smooth loading experiences with spinners and overlays
- **Toast Notifications** - User feedback for actions and errors

### Technical Features
- **Performance Monitoring** - Built-in performance tracking
- **Export Functionality** - Export data to Excel, PDF formats
- **Data Validation** - Form validation and error handling
- **API Integration** - RESTful API services for data management
- **Route Protection** - Secure routes with authentication checks

## Tech Stack

- **Frontend**: React 19.1.1 with Vite 7.1.2
- **Styling**: Tailwind CSS with custom components
- **UI Components**: Radix UI primitives
- **Routing**: React Router DOM 7.8.2
- **HTTP Client**: Axios 1.11.0
- **Date Handling**: date-fns 4.1.0
- **Icons**: Lucide React 0.542.0
- **Export Tools**: jsPDF, xlsx, html2canvas

## Getting Started

### Prerequisites
- Node.js (version 18 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd teacher-portal
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run predeploy` - Run linting and build before deployment
- `npm run deploy` - Deploy to Vercel

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Common components (LanguageSwitcher, etc.)
│   ├── forms/          # Form components
│   ├── layout/         # Layout components (Sidebar, Navbar, etc.)
│   ├── students/       # Student-specific components
│   └── ui/             # Base UI components (Button, Modal, etc.)
├── contexts/           # React contexts (Language, Toast)
├── hooks/              # Custom React hooks
├── pages/              # Page components
│   ├── auth/          # Authentication pages
│   ├── classes/       # Class management pages
│   ├── dashboard/     # Dashboard page
│   ├── profile/       # Profile pages
│   └── students/      # Student management pages
├── utils/             # Utility functions and API services
│   └── api/          # API service modules
├── locales/           # Internationalization files
└── constants/         # Application constants
```

## Configuration

### Environment Variables
The application supports various configuration options through environment variables and settings files.

### API Configuration
API endpoints and configuration can be found in `src/utils/api/config.js`.

### Localization
Language files are located in `src/locales/` supporting English and Khmer.

## Deployment

The application is configured for deployment on Vercel. Use the predeploy script to ensure code quality before deployment:

```bash
npm run predeploy
npm run deploy
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## Development Guidelines

- Follow ESLint rules and coding standards
- Write clean, maintainable code
- Test thoroughly before submitting changes
- Follow the existing component structure and naming conventions

## License

This project is private and proprietary.
