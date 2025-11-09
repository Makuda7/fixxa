# Fixxa React Client

Mobile-first React web application for the Fixxa platform.

## Overview

This is the React frontend for Fixxa, built to provide a better mobile experience for workers and clients. The React app runs in parallel with the existing HTML site, using the same Express backend and PostgreSQL database.

## Architecture

```
React App (Port 3001) → Proxy → Express Backend (Port 3000) → PostgreSQL
```

- **Shared Backend:** Uses existing Express API endpoints
- **Shared Authentication:** Session cookies work across both HTML and React apps
- **Zero Downtime:** HTML site continues to work while React is being developed

---

## Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

---

## Fixxa-Specific Documentation

### Project Structure

```
client/
├── src/
│   ├── components/      # Reusable UI components (to be built)
│   ├── pages/          # Page components (to be built)
│   ├── services/       # API communication
│   │   └── api.js      # Axios instance & all API endpoints
│   ├── contexts/       # React Context providers
│   │   └── AuthContext.js  # Authentication state management
│   ├── hooks/          # Custom React hooks (to be added)
│   ├── App.js          # Main app with routing
│   └── index.js        # Entry point
├── .env.development    # Development environment variables
└── package.json        # Dependencies (includes react-router-dom, axios)
```

### Running the App

**Important:** React dev server runs on port 3001 (not 3000) because Express backend uses port 3000.

1. Start Express backend from project root:
   ```bash
   npm run dev
   ```

2. Start React app from /client folder:
   ```bash
   npm start
   ```

3. Open [http://localhost:3001](http://localhost:3001)

### API Communication

All API calls go through `/src/services/api.js`:

```javascript
import { authAPI, workerAPI, certificationsAPI } from './services/api';

// Login example
const result = await authAPI.login(email, password);

// Get worker bookings
const bookings = await workerAPI.getBookings();
```

Session cookies are automatically included with `withCredentials: true`.

### Authentication

Use the `useAuth` hook to access authentication state:

```javascript
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, isWorker, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return <div>Welcome, {user.name}!</div>;
}
```

### Protected Routes

Use the `ProtectedRoute` component in [App.js](src/App.js):

```javascript
<Route path="/dashboard" element={
  <ProtectedRoute>
    <DashboardPage />
  </ProtectedRoute>
} />
```

### Next Steps

1. Build Login page component
2. Build Registration page component
3. Build Worker Dashboard (mobile-first)
4. Add bottom navigation for mobile
5. Test on actual devices

### Migration Plan

See [REACT_MIGRATION_PLAN.md](../REACT_MIGRATION_PLAN.md) for the complete migration strategy.
