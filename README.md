# Face Scan Attendance System

A modern, AI-powered face recognition attendance system designed for high accuracy and scalability. The system leverages state-of-the-art Deep Learning models to identify users in real-time and logs their attendance securely to the cloud.

![UI Preview](frontend/public/favicon.svg)

## System Architecture

This project adopts a decoupled architecture, allowing the frontend and backend to scale independently.

- **Frontend**: Built with React, Vite, and Tailwind CSS. Features a responsive, mobile-first kiosk interface and an administrative dashboard.
- **Backend**: Python Flask REST API powered by Gunicorn.
- **AI Engine**: Utilizes [DeepFace](https://github.com/serengil/deepface) with the `ArcFace` model and `RetinaFace` detector for robust facial embedding extraction and Cosine Distance matching.
- **Database**: Firebase Firestore (NoSQL) for real-time attendance logging and user profile storage.
- **Hardware Integration**: Includes webhook endpoints designed to accept image payloads from edge devices like ESP32-CAM or Raspberry Pi.

## Features

- **Real-Time Recognition**: Instantaneous face matching against registered embeddings.
- **Duplicate Prevention**: Built-in logic to prevent multiple attendance entries for the same user on the same day.
- **Responsive Dashboard**: Admin view to monitor attendance logs, filter by date/name, and reset records.
- **Live Registration**: Register new users and their facial embeddings directly from the web interface.

---

## Local Development Setup

### 1. Backend Setup

The backend requires Python 3.9+ and system-level dependencies for OpenCV.

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the Flask server
python app.py
```

**Firebase Configuration:**
The backend requires Firebase Admin credentials. 
- Create a Firebase project and generate a Service Account Private Key.
- Save it as `firebase-credentials.json` in the root directory.
- Alternatively, provide the JSON string via the `FIREBASE_CRED_JSON` environment variable.

### 2. Frontend Setup

The frontend uses Vite for lightning-fast HMR.

```bash
cd frontend

# Install Node dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`. API calls are automatically proxied to the backend during local development.

---

## Deployment

This repository is structured as a Monorepo and is ready for production deployment.

- **Frontend (Vercel)**: Set the Root Directory to `frontend`. Add the `VITE_API_URL` environment variable pointing to your backend.
- **Backend (Render)**: Render will automatically detect the `render.yaml` configuration in the root directory. Add your `FIREBASE_CRED_JSON` environment variable in the Render dashboard.

## Database Schema

**Collection: `users`**
- `user_id` (String): Primary key.
- `name` (String): Full name of the user.
- `student_id` (String): Employee/Student ID.
- `face_embedding` (Array of Floats): The DeepFace vector representation.
- `created_at` (ISO String): Registration timestamp.

**Collection: `attendance_logs`**
- `user_id` (String): Reference to the user.
- `name` (String): Denormalized user name.
- `confidence` (Float): AI match confidence percentage.
- `status` (String): Attendance status (e.g., "present").
- `timestamp` (ISO String): Time of scan.

---
*Developed for Machine Vision Systems.*
