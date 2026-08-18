"""
Face Scan Attendance System - Backend (Flask + Firebase Firestore)
Member 4 & 5 scope: GUI, backend, database.

This file is a STARTER SKELETON. Wire it up with:
  - Firebase service account credentials (firebase-credentials.json)
  - The face recognition model from Member 1-3 (see recognize_face() below)

Run:
  pip install -r requirements.txt
  python app.py
"""

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import base64
import uuid
import os
import json
import csv
from io import StringIO
import threading
import cv2
import numpy as np
from deepface import DeepFace
import FaceRecognitionAttendenceSystem as fr_system

app = Flask(__name__)
# Enable CORS for all routes (to allow Vercel frontend to talk to Render backend)
CORS(app)

# ---------------------------------------------------------------------------
# 1. FIREBASE SETUP
# ---------------------------------------------------------------------------
# In local development: uses 'firebase-credentials.json' in this folder.
# In Render production: configure FIREBASE_CRED_PATH env var to point to your Secret File.
# Alternatively, you can use a JSON string in FIREBASE_CRED_JSON.
CRED_PATH = os.environ.get("FIREBASE_CRED_PATH", "firebase-credentials.json")
FIREBASE_STORAGE_BUCKET = "attendance-system-mv-51ba6.firebasestorage.app"

if os.path.exists(CRED_PATH):
    cred = credentials.Certificate(CRED_PATH)
elif os.environ.get("FIREBASE_CRED_JSON"):
    cred_dict = json.loads(os.environ.get("FIREBASE_CRED_JSON"))
    cred = credentials.Certificate(cred_dict)
else:
    cred = None

if cred:
    firebase_admin.initialize_app(cred, {"storageBucket": FIREBASE_STORAGE_BUCKET})
    db = firestore.client()
    from firebase_admin import storage
    bucket = storage.bucket()
    
    # Start polling loop for Cloud Processing Architecture
    print("Starting face recognition polling thread...")
    polling_thread = threading.Thread(target=fr_system.start_polling, args=(db, bucket), daemon=True)
    polling_thread.start()
else:
    db = None
    bucket = None
    print("[WARN] Firebase credentials not found. Running without database connection.")
    print("       Ensure FIREBASE_CRED_PATH or FIREBASE_CRED_JSON env var is set on Render.")


# ---------------------------------------------------------------------------
# 2. FACE RECOGNITION HOOK (to be connected with Member 1-3's model)
# ---------------------------------------------------------------------------
def recognize_face(image_bytes):
    """
    Placeholder for the face recognition model integration.

    Coordinate with Member 1-3 on the exact input/output format. Suggested
    contract:
        input:  raw image bytes (from camera capture)
        output: dict like:
            {
                "matched": True,
                "user_id": "student_1234",
                "name": "Jane Doe",
                "confidence": 0.93
            }
        or {"matched": False} if no match found.

    Replace this stub with an actual call to their model, e.g.:
        from model.recognizer import predict
        result = predict(image_bytes)
        return result
    """
    # Real recognition using DeepFace and Firestore
    if not db:
        return {"matched": False, "reason": "no db"}

    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image_cv = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image_cv is None:
        return {"matched": False, "reason": "invalid image"}
        
    image_rgb = cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB)
    try:
        faces = DeepFace.extract_faces(img_path=image_rgb, detector_backend=fr_system.DETECTOR, enforce_detection=False)
        if len(faces) == 0:
            return {"matched": False, "reason": "no face detected"}
            
        area = faces[0]["facial_area"]
        x, y, w, h = area["x"], area["y"], area["w"], area["h"]
        img_h, img_w = image_rgb.shape[:2]
        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(img_w, x + w), min(img_h, y + h)
        face_crop = image_rgb[y1:y2, x1:x2]
        
        embedding_result = DeepFace.represent(
            img_path=face_crop,
            model_name=fr_system.MODEL_NAME,
            detector_backend="skip",
            enforce_detection=False
        )
        embedding = embedding_result[0]["embedding"]
    except Exception as e:
        return {"matched": False, "reason": f"Face extraction failed: {str(e)}"}

    users = db.collection("users").stream()
    best_distance = float("inf")
    best_user = None
    
    for doc in users:
        user_data = doc.to_dict()
        known_emb = user_data.get("face_embedding")
        if not known_emb or not isinstance(known_emb, list):
            continue
            
        dist = fr_system.cosine_distance(embedding, known_emb)
        if dist < best_distance:
            best_distance = dist
            best_user = user_data
            
    if best_user and best_distance <= fr_system.DISTANCE_THRESHOLD:
        confidence = float(fr_system.calculate_confidence(best_distance))
        return {
            "matched": True,
            "user_id": best_user.get("user_id"),
            "name": best_user.get("name"),
            "confidence": confidence
        }
        
    return {"matched": False, "reason": "no match found"}


# ---------------------------------------------------------------------------
# 3. ROUTES - GUI PAGES
# ---------------------------------------------------------------------------
@app.route("/")
def dashboard():
    """Main dashboard: shows recent attendance logs."""
    logs = []
    if db:
        docs = (
            db.collection("attendance_logs")
            .order_by("timestamp", direction=firestore.Query.DESCENDING)
            .limit(50)
            .stream()
        )
        logs = [doc.to_dict() for doc in docs]
    return render_template("dashboard.html", logs=logs)


@app.route("/register", methods=["GET"])
def register_page():
    """Page to register a new user's face profile."""
    return render_template("register.html")


@app.route("/capture", methods=["GET"])
def capture_page():
    """Live capture page: shows webcam feed and scans for attendance."""
    return render_template("capture.html")


# ---------------------------------------------------------------------------
# 4. ROUTES - API / BACKEND LOGIC
# ---------------------------------------------------------------------------
@app.route("/api/register", methods=["POST"])
def api_register():
    """
    Register a new user's face profile.
    Expects JSON: { "name": str, "student_id": str, "image_base64": str }
    """
    data = request.get_json(force=True)
    name = data.get("name")
    student_id = data.get("student_id")
    image_b64 = data.get("image_base64")

    if not all([name, student_id, image_b64]):
        return jsonify({"error": "Missing required fields"}), 400

    image_bytes = base64.b64decode(image_b64)
    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image_cv = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image_cv is None:
        return jsonify({"error": "Invalid image format"}), 400

    image_rgb = cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB)
    
    try:
        embedding_result = DeepFace.represent(
            img_path=image_rgb,
            model_name="ArcFace",
            detector_backend="retinaface",
            enforce_detection=False
        )
        embedding = embedding_result[0]["embedding"]
    except Exception as e:
        return jsonify({"error": f"Face extraction failed: {str(e)}"}), 500

    user_id = student_id or str(uuid.uuid4())

    if db:
        # Save user to Firestore including the generated embedding
        db.collection("users").document(user_id).set({
            "user_id": user_id,
            "name": name,
            "student_id": student_id,
            "created_at": datetime.utcnow().isoformat(),
            "face_embedding": embedding,
        })

    return jsonify({"status": "ok", "user_id": user_id})


@app.route("/api/capture", methods=["POST"])
def api_capture():
    """
    [DEMO / FALLBACK PATH]
    Receives a captured frame from the GUI/camera, runs recognition,
    and logs attendance if a match is found.
    
    NOTE: In the production edge-device architecture, the Raspberry Pi
    performs the recognition locally and submits matches to /api/attendance/log.
    This endpoint is retained for testing or web-only demonstrations
    when the hardware is unavailable.
    
    Expects JSON: { "image_base64": str }
    """
    data = request.get_json(force=True)
    image_b64 = data.get("image_base64")
    if not image_b64:
        return jsonify({"error": "Missing image_base64"}), 400

    image_bytes = base64.b64decode(image_b64)
    result = recognize_face(image_bytes)
    print("DEBUG recognize_face result:", result)

    if result.get("matched"):
        if db:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            today_end = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
            
            existing = list(db.collection("attendance_logs")
                            .where("user_id", "==", result["user_id"])
                            .where("timestamp", ">=", today_start)
                            .where("timestamp", "<=", today_end)
                            .limit(1)
                            .stream())
            if existing:
                return jsonify({"status": "already_present", "message": "Already present today"})

        log_entry = {
            "user_id": result["user_id"],
            "name": result["name"],
            "confidence": result.get("confidence"),
            "timestamp": datetime.utcnow().isoformat(),
            "status": "present",
        }
        if db:
            db.collection("attendance_logs").add(log_entry)
        return jsonify({"status": "recorded", "data": log_entry})
    else:
        return jsonify({"status": "no_match", "reason": result.get("reason")})


@app.route("/api/attendance", methods=["GET"])
def api_attendance():
    """Returns attendance logs, optionally filtered by date or user_id."""
    if not db:
        return jsonify({"error": "Database not connected"}), 503

    query = db.collection("attendance_logs")
    date_filter = request.args.get("date")
    user_filter = request.args.get("user_id")

    if user_filter:
        query = query.where("user_id", "==", user_filter)

    docs = query.order_by("timestamp", direction=firestore.Query.DESCENDING).stream()
    logs = []
    for doc in docs:
        d = doc.to_dict()
        if "timestamp" in d and hasattr(d["timestamp"], "isoformat"):
            d["timestamp"] = d["timestamp"].isoformat()
        logs.append(d)

    if date_filter:
        logs = [l for l in logs if l.get("timestamp", "").startswith(date_filter)]

    return jsonify(logs)

@app.route("/api/attendance/reset", methods=["DELETE"])
def api_attendance_reset():
    """Wipes all attendance logs."""
    if not db:
        return jsonify({"error": "Database not connected"}), 503
        
    try:
        docs = db.collection("attendance_logs").stream()
        count = 0
        for doc in docs:
            doc.reference.delete()
            count += 1
        return jsonify({"status": "success", "message": f"Deleted {count} logs."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500





@app.route("/api/attendance/export", methods=["GET"])
def api_attendance_export():
    """Returns a downloadable CSV file of attendance records."""
    if not db:
        return jsonify({"error": "Database not connected"}), 503

    query = db.collection("attendance_logs")
    date_filter = request.args.get("date")

    docs = query.order_by("timestamp", direction=firestore.Query.DESCENDING).stream()
    logs = []
    for doc in docs:
        d = doc.to_dict()
        if "timestamp" in d and hasattr(d["timestamp"], "isoformat"):
            d["timestamp"] = d["timestamp"].isoformat()
        logs.append(d)

    if date_filter:
        logs = [l for l in logs if l.get("timestamp", "").startswith(date_filter)]

    # Generate CSV
    si = StringIO()
    cw = csv.writer(si)
    cw.writerow(["Timestamp", "User ID", "Name", "Confidence", "Status"])
    for log in logs:
        cw.writerow([
            log.get("timestamp", ""),
            log.get("user_id", ""),
            log.get("name", ""),
            log.get("confidence", ""),
            log.get("status", "")
        ])

    output = si.getvalue()
    return app.response_class(
        output,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=attendance.csv"}
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=5000)
