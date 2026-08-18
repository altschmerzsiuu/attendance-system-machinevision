# Face Scan Attendance System

A modern, AI-powered face recognition attendance system designed for high accuracy. The system leverages state-of-the-art Deep Learning models to identify users in real-time and logs their attendance securely to the cloud.

![UI Preview](frontend/public/favicon.svg)

## System Architecture (Local Demonstration)

This project runs locally but is split into a distinct frontend and backend for a modern development experience.

- **Frontend**: Built with React, Vite, and Tailwind CSS. Runs on port `5173`.
- **Backend**: Python Flask API. Runs on port `5000`.
- **AI Engine**: Utilizes [DeepFace](https://github.com/serengil/deepface) with the high-accuracy `ArcFace` model and `RetinaFace` detector.
- **Database**: Firebase Firestore (NoSQL) for cloud attendance logging.

---

## Local Development & Demo Setup

To run a demonstration, you must start both the backend server and the frontend server. The frontend is configured to be accessible from your mobile phone on the same WiFi network via HTTPS (required for camera access).

### 1. Start the Backend

Open a terminal in the root directory:

```bash
# Install dependencies (only needed once)
pip install -r requirements.txt

# Start the Python server
python app.py
```
*Note: Make sure your `firebase-credentials.json` is placed in this root directory!*

### 2. Start the Frontend

Open a **new** terminal, and navigate to the `frontend` folder:

```bash
cd frontend

# Install Node dependencies (only needed once)
npm install

# Start the Vite server with Local Network exposure
npm run dev
```

### 3. Accessing the App (Mobile Demo)

When you run `npm run dev`, Vite will print a `Local` and a `Network` URL.
1. Look for the **Network** URL (e.g., `https://192.168.1.5:5173/`).
2. Type that URL exactly into your mobile phone's browser (make sure your phone is on the same WiFi as your laptop).
3. Since we use a self-signed SSL certificate for local camera testing, your browser will show a security warning. Click **"Advanced" -> "Proceed anyway"** to access the site and grant camera permissions.

---
*Developed for Machine Vision Systems.*
