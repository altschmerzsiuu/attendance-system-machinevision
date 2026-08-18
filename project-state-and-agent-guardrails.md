# Project State & Agent Guardrails — Face Scan Attendance System

**Read this ENTIRE file before making any changes.** This project has several
moving parts built at different times, some of which look similar but serve
different purposes. Combining or "cleaning up" the wrong things will break
working functionality.

---

## 1. What this project is

A Face Scan Attendance System for a Machine Vision course group project.
This repo covers **Member 4 & 5's scope only**: GUI, backend, and database.
Face recognition itself is being built separately by Members 1-3.

---

## 2. Current architecture (confirmed, do not silently change)

Recognition happens on a **physical edge device** (Raspberry Pi + camera,
running OpenCV/Dlib locally) — NOT in the cloud backend. The cloud backend's
role is: manage enrollment, sync embedding data to the edge device, and
receive already-confirmed attendance events.

```
Enrollment (cloud):  Photo upload → backend generates embedding → Firestore
Recognition (edge):  Camera → local match against synced embeddings → confirmed result
Logging (cloud):     Edge device POSTs the confirmed result → Firestore
```

---

## 3. What has been built so far

### Backend (`app.py` — Flask)
- `POST /api/register` — saves a new user (name, student_id). Face embedding
  storage is stubbed, pending Members 1-3's model.
- `GET /api/attendance` — returns attendance logs, supports `?date=` and
  `?user_id=` filters. Used by the dashboard.
- `POST /api/capture` — **DEMO MODE ONLY.** Takes a photo from a browser
  webcam and runs a placeholder match. This is NOT the production
  recognition path — it exists only for presenting/testing without the
  physical Raspberry Pi on hand. It is clearly commented as demo-only in
  the code and labeled in the GUI.
- `GET /api/sync/embeddings` — the edge device downloads all registered
  users' embeddings from here on boot, to cache locally.
- `POST /api/attendance/log` — the edge device POSTs a confirmed match
  (`user_id`, `confidence`, `timestamp`) here after doing recognition
  locally. No image is sent — the device already knows the result.
- `GET /api/attendance/export` — generates a CSV of attendance records.

### Database (Firebase Firestore)
Two collections, already tested and working:
- `users`: `user_id`, `name`, `student_id`, `created_at`, (`face_embedding`
  — pending)
- `attendance_logs`: `user_id`, `name`, `confidence`, `timestamp`, `status`

### Firebase Storage (separate service, added later — see Section 5)
A bucket (`attendance-system-mv-51ba6.firebasestorage.app`) was set up
**for a different, temporary purpose**: letting a teammate grab raw
captured images to develop/test the recognition model, without waiting on
the hardware integration to be finished. See Section 5 — do not confuse
this with the attendance logging pipeline.

- `upload_capture.py` — a standalone script (not part of `app.py`) that
  uploads a raw image to `captures/{device_id}/{timestamp}_{id}.jpg` in
  Storage.
- `fetch_captures.py` — a standalone script for downloading those images
  for model development/testing.

### Frontend
- HTML prototype (`templates/`) — fully working and tested: register,
  capture (demo mode), dashboard.
- React version — in progress. `Capture.jsx` has been updated with a
  visible "Demo mode — for testing without hardware" badge.

### Testing done
- Full register → capture (demo/stub match) → dashboard flow tested
  end-to-end and confirmed working.
- The new endpoints (`/api/sync/embeddings`, `/api/attendance/log`,
  `/api/attendance/export`) have passed a Python syntax check
  (`py_compile`) only — **they have NOT yet been manually tested** with
  real requests. Do not assume they are fully verified.

---

## 4. What is NOT done yet

- Real face recognition model integration (waiting on Members 1-3)
- Manual/functional testing of the three new endpoints listed above
- React frontend — still in progress, not feature-complete
- The actual Raspberry Pi script that will call `/api/sync/embeddings` and
  `/api/attendance/log` in production
- Nothing has been deployed anywhere yet — everything runs locally

---

## 5. CRITICAL: Two separate Firebase services, two separate purposes

This is the single most important thing to get right. Do NOT mix these up:

| | **Firestore** | **Storage** |
|---|---|---|
| Purpose | The actual attendance system's database | Temporary dump for raw captured images |
| Used by | `app.py` (the real backend) | `upload_capture.py` / `fetch_captures.py` (standalone scripts, not part of `app.py`) |
| Data | Structured records: users, attendance logs, (later) embeddings | Raw `.jpg` files, unprocessed |
| Is this the production path? | Yes | **No** — it's a workaround so a teammate isn't blocked while waiting on hardware integration |

**Do not:**
- Add code that writes captured images from `Storage` into `attendance_logs`
  in Firestore. They are unrelated.
- Assume `upload_capture.py` / `fetch_captures.py` should be merged into
  `app.py`. They were intentionally kept separate and simple so a teammate
  could use them immediately without touching the main backend.
- Replace the `GET /api/sync/embeddings` endpoint's purpose with anything
  related to Storage. Embeddings sync is Firestore-only.
- Treat this Storage bucket as a general "add it to the main app" task
  unless explicitly asked to formally integrate it later.

---

## 6. Guardrails — follow these before executing ANY task

1. **Read the current file(s) in full before editing.** Do not assume the
   contract described in an old chat message or an old version of this
   document still matches what's actually in the code — always check
   what's there right now.

2. **Don't touch what's already working** (Firestore schema, `/register`,
   `/api/attendance`, the HTML prototype) unless the task explicitly
   requires it. If a task seems like it would require changing a working
   part, stop and flag it instead of proceeding.

3. **Don't silently merge the Storage workflow with the Firestore
   workflow.** If a task description is ambiguous about which one it
   means, ask before writing code — see Section 5.

4. **Don't assume architecture decisions can be changed on your own.** The
   edge-device recognition architecture (Section 2) was a deliberate team
   decision. If a task seems to conflict with it (e.g., moving matching
   logic back into the cloud), flag this instead of just implementing it.

5. **Test before declaring something done.** A successful syntax check
   (`py_compile`) is not the same as a working feature. For any new
   endpoint or script, actually run it and verify the output (e.g., check
   Firestore/Storage console, or use curl/Postman) before reporting
   completion.

6. **Check credentials and config before running scripts.**
   `firebase-credentials.json` and the bucket name
   (`attendance-system-mv-51ba6.firebasestorage.app`) must be present and
   correct — don't assume they exist in whatever environment you're
   running in.

7. **If a request from a teammate conflicts with an already-agreed
   contract** (e.g., the embedding format discussed with Members 1-3, or
   the API contracts above), do not just go along with the new version —
   point out the conflict so the team can confirm before you proceed.

8. **When in doubt, ask, don't guess.** This is a multi-person group
   project; wrong assumptions here cost the whole team time, not just one
   person.

---

## 7. Suggested next tasks (in order)

1. Manually test `/api/sync/embeddings`, `/api/attendance/log`, and
   `/api/attendance/export` with real requests — confirm data actually
   lands correctly in Firestore / downloads correctly as CSV.
2. Confirm the Storage bucket region/setup is finalized, then make sure
   `upload_capture.py` is handed to the hardware teammate and
   `fetch_captures.py` is confirmed working for whoever needs to process
   images.
3. Continue the React frontend build.
4. Once Members 1-3 share their model's input/output contract, connect it
   to the two marked integration points in `app.py` (embedding generation
   at registration, and note that live matching itself will run on the
   edge device, not in `app.py`).
5. Write the Raspberry Pi-side script that calls
   `GET /api/sync/embeddings` and `POST /api/attendance/log` — this hasn't
   been started yet.
