# 🖼️ BulkyLoad – Bulk Image Downloader from URL Lists

A powerful, modern web application for downloading multiple images from URL lists with advanced features like SVG to PNG conversion, user authentication, and download limits.

## ✨ Features

### 🎯 Core Functionality
- **Bulk Image Download**: Download multiple images from URL lists
- **SVG to PNG Conversion**: Automatic conversion of SVG files to PNG format
- **ZIP Creation**: Automatically create ZIP archives for multiple downloads
- **File Upload**: Upload text files containing URLs
- **URL Validation**: Validate URLs before downloading
- **Preview Images**: Preview images before downloading

### 👤 User Management
- **Anonymous Users**: 5 downloads per day (IP-based tracking)
- **Free Users**: 10 downloads per day (account required)
- **Pro Users**: Unlimited downloads ($7/month subscription)
- **User Authentication**: JWT-based authentication system
- **Download History**: Track download history for authenticated users

### 🛠️ Technical Features
- **Modern Stack**: React + Vite frontend, Express + Node.js backend
- **Database**: MongoDB with Mongoose ODM
- **Real-time Progress**: Download progress tracking
- **Error Handling**: Comprehensive error handling and user feedback
- **Responsive Design**: Mobile-friendly interface
- **SEO Optimized**: Ready for production deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (local or cloud)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bulkload.git
   cd bulkload
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   
   **Backend** (`backend/.env`):
   ```env
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/bulkload
   JWT_SECRET=your-super-secret-jwt-key
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   ```
   
   **Frontend** (`frontend/.env`):
   ```env
   VITE_API_URL=http://localhost:3001
   VITE_APP_NAME=BulkyLoad
   VITE_APP_DESCRIPTION=Bulk Image Downloader from URL Lists
   ```

4. **Start the application**
   ```bash
   # Start both frontend and backend (from root directory)
   npm run dev
   
   # Or start individually:
   # Backend (from backend directory)
   cd backend && npm run dev
   
   # Frontend (from frontend directory)
   cd frontend && npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 📁 Project Structure

```
bulkload/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── pages/          # Page components
│   │   └── App.jsx         # Main app component
│   ├── public/             # Static assets
│   └── package.json
├── backend/                 # Express + Node.js backend
│   ├── routes/             # API routes
│   ├── models/             # Mongoose models
│   ├── middleware/         # Express middleware
│   ├── server.js           # Main server file
│   └── package.json
├── DEPLOYMENT.md           # Deployment guide
├── README.md              # This file
└── package.json           # Root package.json
```

## 🎨 Usage

### For Anonymous Users
1. Visit the application
2. Enter image URLs (one per line) or upload a text file
3. Click "Download Images"
4. Files will be downloaded as a ZIP archive
5. **Limit**: 5 downloads per day

### For Registered Users
1. Sign up for a free account
2. Get 10 downloads per day
3. Access download history
4. Upgrade to Pro for unlimited downloads

### Supported URL Formats
- Direct image URLs: `https://example.com/image.jpg`
- URLs with parameters: `https://example.com/image.png?size=large`
- Base64 data URLs: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`
- SVG files (automatically converted to PNG)

## 🚀 Deployment

### Option 1: Vercel + Render (Recommended)
- **Frontend**: Deploy to Vercel for SEO optimization
- **Backend**: Deploy to Render for API hosting
- **Cost**: $0/month for small apps

### Option 2: All on Vercel
- Convert backend to Vercel serverless functions
- Single platform deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 🔧 Configuration

### Environment Variables

#### Backend
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/bulkload` |
| `JWT_SECRET` | JWT secret key | Required |
| `NODE_ENV` | Environment mode | `development` |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:5173` |

#### Frontend
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3001` |
| `VITE_APP_NAME` | Application name | `BulkyLoad` |
| `VITE_APP_DESCRIPTION` | App description | `Bulk Image Downloader from URL Lists` |

## 🛠️ Development

### Available Scripts

#### Root Directory
```bash
npm run dev          # Start both frontend and backend
npm run build        # Build both frontend and backend
npm run start        # Start production build
```

#### Backend
```bash
cd backend
npm run dev          # Start development server
npm run start        # Start production server
npm run build        # Build for production
```

#### Frontend
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Code Structure

#### Frontend Components
- `BulkImageDownloader`: Main download component
- `PricingPage`: Pricing page component
- `AuthContext`: Authentication context
- `MainLayout`: Layout wrapper

#### Backend Routes
- `POST /api/download/images`: Download images
- `POST /api/download/validate`: Validate URLs
- `GET /api/download/remaining`: Get remaining downloads
- `POST /api/auth/register`: User registration
- `POST /api/auth/login`: User login

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - Frontend framework
- [Vite](https://vitejs.dev/) - Build tool
- [Express](https://expressjs.com/) - Backend framework
- [Mongoose](https://mongoosejs.com/) - MongoDB ODM
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Lucide React](https://lucide.dev/) - Icons

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/bulkload/issues)
- **Documentation**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Email**: support@bulkload.com

---

**Made with ❤️ by the BulkyLoad Team** 