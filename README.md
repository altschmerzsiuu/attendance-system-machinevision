# Face Scan Attendance System — Backend + GUI (Member 4 & 5)

Starter skeleton for the GUI/backend/database scope of the group project.
Stack: Flask (backend + server-rendered GUI) + Firebase Firestore (database).

## Setup

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Create a Firebase project at https://console.firebase.google.com, enable
   **Firestore Database**, then go to
   Project Settings > Service Accounts > Generate new private key.
   Save the downloaded JSON file as `firebase-credentials.json` in this folder
   (do not commit this file — add it to `.gitignore`).

3. Run the app:
   ```
   python app.py
   ```
   Visit http://localhost:5000 for the dashboard, and
   http://localhost:5000/register to register a new user.

## Firestore schema

**Collection: `users`**
| Field | Type | Description |
|---|---|---|
| user_id | string | primary key (student/employee ID) |
| name | string | full name |
| student_id | string | student/employee ID |
| created_at | string (ISO datetime) | registration time |
| face_embedding | array/blob | added once the recognition model is integrated |

**Collection: `attendance_logs`**
| Field | Type | Description |
|---|---|---|
| user_id | string | which user this log belongs to |
| name | string | denormalized for easy display |
| confidence | float | match confidence score from the model |
| timestamp | string (ISO datetime) | when attendance was recorded |
| status | string | e.g. "present" |

## Integration point with Member 1-3 (dataset/model team)

The single most important thing to agree on with them is the **contract** for
`recognize_face()` in `app.py`:
- What do they need as input? (raw image bytes, a cropped face, a specific size?)
- What do they return? (user_id + confidence score, or something else?)

Once agreed, replace the stub in `recognize_face()` with a real call to their
model (e.g. importing their inference function, or calling a small model
server they expose).

## What's left to build

- [ ] Connect `recognize_face()` to the actual trained model
- [ ] Add basic admin login (Flask sessions or Flask-Login) if the lecturer
      wants access control on the dashboard
- [ ] Add filtering UI on the dashboard (by date, by name) — the
      `/api/attendance` endpoint already supports `?date=` and `?user_id=`
- [ ] Decide on camera capture flow: continuous polling from a webcam feed,
      or a manual "scan" button
- [ ] Deploy: Firebase Hosting (for static/GUI) + a small server (Render,
      Railway, or a Raspberry Pi) for the Flask backend
