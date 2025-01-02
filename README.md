# HustBook

HustBook is a social networking platform designed for students and alumni of Hanoi University of Science and Technology (HUST). It provides features for user authentication, posting, commenting, and real-time messaging.

## Table of Contents

- [Features](#features)
- [Technologies](#technologies)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Features

- User authentication (signup, login, logout)
- Post creation, editing, and deletion
- Commenting on posts
- Real-time messaging
- Friend requests and connections
- Profile management
- Search functionality

## Technologies

- Frontend:
  - Vue.js 3
  - Vite
  - Tailwind CSS
  - Pinia (for state management)
- Backend:
  - Node.js
  - Express.js
  - Firebase (Authentication and Firestore)
- Database:
  - Firestore

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- Firebase account and project

### Installation

1. Clone the repository:
git clone [https://github.com/manhpow1/HustBook.git](https://github.com/manhpow1/HustBook.git)
cd hustbook

2. Install dependencies for both client and server:
cd client && npm install
cd ../server && npm install

3. Set up environment variables:

- Copy `.env.example` to `.env` in both `client` and `server` directories
- Fill in the required environment variables

## Project Structure

```
# hustbook/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── config/
│   │   ├── router/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── styles/
│   │   ├── utils/
│   │   ├── views/
│   │   ├── App.vue
│   │   └── main.js
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   └── app.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
└── README.md
```

## Configuration

1. Firebase setup:
   - Create a Firebase project
   - Enable Authentication and Firestore
   - Add your Firebase configuration to `client/src/config/firebase.js`
   - Generate a service account key and save it as `server/serviceAccountKey.json`

2. Environment variables:
   - Set up the required environment variables in both `client/.env` and `server/.env` files

## Running the Application

1. Start the server:
cd server
npm run dev

2. Start the client:
cd client
npm run dev

3. Open your browser and navigate to `http://localhost:5173`

## Testing

- Run client-side tests:
cd client
npm run test
- Run server-side tests:
cd server
npm run test

## Deployment

1. Build the client:
cd client
npm run build

2. Deploy the server to your preferred hosting platform (e.g., Heroku, DigitalOcean)

3. Set up environment variables on your hosting platform

4. Deploy the client build to a static hosting service (e.g., Netlify, Vercel)

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License.
