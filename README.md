# AI_Real_Estate_Platform

A full-stack modern Real Estate Marketplace application built with the MERN stack (MongoDB, Express, React, Node.js). This platform allows users to list, search, and manage properties for sale or rent, providing a seamless experience for both buyers and sellers.

## 🚀 Features

*   **Advanced Authentication:** Secure Sign In and Sign Up using JWT (JSON Web Tokens) and Google OAuth integration via Firebase.
*   **Property Management:** Users can create, update, and delete their own property listings.
*   **Image Handling:** Multiple image uploads for listings with cloud storage integration (Cloudinary/Firebase).
*   **Search & Filter:** Advanced search functionality with filters for offer type (sale/rent), amenities, sorting, and more.
*   **User Dashboard:** specialized profile management to view and handle active listings.
*   **Interactive UI:** Responsive design built with Tailwind CSS, featuring image sliders and modern components.
*   **Smart Features:**
    *   **Recommendation Engine:** Suggests properties based on user interactions on the website.
    *   **Price Prediction:** Provides estimated evaluations for property prices.
*   **Additional Tools:**
    *   **Favorites:** Save listings to view later.
    *   **Compare:** Compare features of different properties.
    *   **Recently Visited:** Keep track of properties you've looked at.
    *   **Contact Owners:** Direct communication features for interested buyers.

## 🛠️ Tech Stack

**Frontend:**
*   **React** (Vite)
*   **Redux Toolkit** (State Management & Persistence)
*   **Tailwind CSS** (Styling)
*   **Firebase** (Authentication & Storage)
*   **React Router DOM** (Routing)
*   **Swiper** (Carousels)

**Backend:**
*   **Node.js**
*   **Express.js**
*   **MongoDB** (Database) with **Mongoose** (ODM)
*   **JWT** (Authentication)

## 📦 Installation

To get this project up and running in your local environment, follow these steps.

### Prerequisites

*   Node.js (v14+ recommended)
*   npm
*   MongoDB Atlas Account (or local MongoDB instance)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/AI_Real_Estate_Platform.git
cd AI_Real_Estate_Platform
```

### 2. Install Dependencies

Install dependencies for both the backend (root) and frontend (client).

**Root (Server):**
```bash
npm install
```

**Client (Frontend):**
```bash
cd client
npm install
```

### 3. Environment Variables

Create a `.env` file in the **root** directory for the backend and add the following:

```env
MONGO="your_mongodb_connection_string"
JWT_SECRET="your_secret_key"
```

Create a `.env` file in the **client** directory (if required by your setup) or ensure your Firebase configuration in `client/src/firebase.js` is set up correctly with your API keys.

```env
VITE_FIREBASE_API_KEY="your_firebase_api_key"
```

### 4. Run the Application

You need to run both the backend and frontend servers.

**Option 1: Two Terminals**

Terminal 1 (Backend):
```bash
# In the root directory
npm run dev
```

Terminal 2 (Frontend):
```bash
# In the client directory
cd client
npm run dev
```

**Option 2: Concurrent (If configured)**
*Check `package.json` for concurrent scripts if available.*

The application should now be running.
*   **Backend:** http://localhost:3000 (typically)
*   **Frontend Check the terminal for the Vite local URL (e.g., http://localhost:5173)**

## 📂 Project Structure

```
AI_Real_Estate_Platform/
├── api/                # Backend Controllers, Models, Routes
├── client/             # Frontend React Application
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── redux/
│   │   ├── App.jsx
│   │   └── ...
├── package.json        # Root dependencies and scripts
└── ...
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the [ISC License](LICENSE).
