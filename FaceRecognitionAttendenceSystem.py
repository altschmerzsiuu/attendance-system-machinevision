import os
import logging
import warnings
import time
import hashlib
import cv2
import numpy as np
from deepface import DeepFace
from firebase_admin import firestore

# ============================================================
# SUPPRESS WARNINGS
# ============================================================
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_USE_LEGACY_KERAS"] = "1"

logging.getLogger("tensorflow").setLevel(logging.FATAL)
logging.getLogger("absl").setLevel(logging.FATAL)
warnings.filterwarnings("ignore")

# ============================================================
# CONFIGURATION
# ============================================================
MODEL_NAME = "ArcFace"
DETECTOR = "retinaface"
DISTANCE_THRESHOLD = 0.45
FIREBASE_IMAGE_FOLDER = "images/"
USERS_COLLECTION = "users"
ATTENDANCE_COLLECTION = "attendance_logs"
USER_NAME_FIELD = "name"
USER_ID_FIELD = "user_id"
CHECK_INTERVAL_SECONDS = 5

def cosine_distance(a, b):
    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 1.0
    return 1.0 - (np.dot(a, b) / (norm_a * norm_b))

def calculate_confidence(distance):
    if distance == float("inf"):
        return 0.0
    confidence = 1.0 - (distance / DISTANCE_THRESHOLD)
    confidence = max(0.0, min(1.0, confidence))
    return float(confidence)

def get_user_id_by_name(db, name):
    try:
        docs = db.collection(USERS_COLLECTION).where(USER_NAME_FIELD, "==", name).limit(1).stream()
        for doc in docs:
            data = doc.to_dict()
            user_id = data.get(USER_ID_FIELD)
            if user_id is not None:
                return str(user_id)
    except Exception as e:
        print(f"  Failed to find user ID for {name}: {e}")
    return None

def create_document_id(blob_name, generation, face_index):
    unique_string = f"{blob_name}_{generation}_face_{face_index}"
    document_id = hashlib.sha256(unique_string.encode("utf-8")).hexdigest()
    return document_id

def save_attendance_result(db, blob_name, generation, face_index, name, user_id, confidence, status, cosine_distance_value):
    document_id = create_document_id(blob_name, generation, face_index)
    document_ref = db.collection(ATTENDANCE_COLLECTION).document(document_id)
    existing = document_ref.get()

    if existing.exists:
        print(f"  Firestore record already exists for {blob_name}, Face #{face_index}.")
        return False

    # Prevent duplicate scanning on the same day for a known user
    if user_id:
        from datetime import datetime
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        today_end = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
        
        today_logs = list(db.collection(ATTENDANCE_COLLECTION)
                        .where("user_id", "==", user_id)
                        .where("timestamp", ">=", today_start)
                        .where("timestamp", "<=", today_end)
                        .limit(1)
                        .stream())
        if today_logs:
            print(f"  Skipping duplicate log: User {name} ({user_id}) already marked present today.")
            return False

    data = {
        "name": name,
        "user_id": user_id,
        "confidence": round(confidence, 4),
        "cosine_distance": round(cosine_distance_value, 4),
        "status": status,
        "timestamp": firestore.SERVER_TIMESTAMP,
        "source_image": blob_name
    }
    document_ref.set(data)
    print("  Firestore attendance record saved.")
    return True

def get_firebase_images(bucket, known_blob_ids=None):
    images = []
    try:
        blobs = bucket.list_blobs(prefix=FIREBASE_IMAGE_FOLDER)
        for blob in blobs:
            if blob.name.endswith("/"):
                continue
            if not blob.name.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
                continue

            blob_key = f"{blob.name}_{blob.generation}"
            if known_blob_ids is not None and blob_key in known_blob_ids:
                continue

            print(f"Found NEW Firebase image: {blob.name}")
            image_bytes = blob.download_as_bytes()
            image_array = np.frombuffer(image_bytes, dtype=np.uint8)
            image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

            if image is None:
                print(f"  Could not decode {blob.name}")
                continue

            images.append({
                "blob_name": blob.name,
                "generation": str(blob.generation),
                "image": image
            })
    except Exception as e:
        print(f"Failed to read Firebase Storage: {e}")
    return images

def fetch_known_embeddings(db):
    embeddings = []
    names = []
    try:
        docs = db.collection(USERS_COLLECTION).stream()
        for doc in docs:
            data = doc.to_dict()
            emb = data.get("face_embedding")
            name = data.get("name", "Unknown")
            if isinstance(emb, list) and len(emb) > 0:
                embeddings.append(emb)
                names.append(name)
    except Exception as e:
        print(f"Failed to fetch embeddings from Firestore: {e}")
    return embeddings, names

def process_firebase_image(db, known_embeddings, known_names, firebase_item):
    blob_name = firebase_item["blob_name"]
    generation = firebase_item["generation"]
    image = firebase_item["image"]
    img_name = os.path.basename(blob_name)

    print(f"Processing Firebase Image: {img_name}")
    img_h, img_w = image.shape[:2]

    try:
        faces = DeepFace.extract_faces(img_path=image, detector_backend=DETECTOR, enforce_detection=False)
    except Exception as e:
        print(f"Face detection failed: {e}")
        return

    if len(faces) == 0:
        print("No faces detected.")
        return

    for idx, face in enumerate(faces, 1):
        area = face["facial_area"]
        x, y, w, h = area["x"], area["y"], area["w"], area["h"]
        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(img_w, x + w), min(img_h, y + h)
        face_crop = image[y1:y2, x1:x2]

        if face_crop.size == 0:
            continue

        face_crop_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)

        try:
            embedding_result = DeepFace.represent(
                img_path=face_crop_rgb,
                model_name=MODEL_NAME,
                detector_backend="skip",
                enforce_detection=False
            )
            embedding = embedding_result[0]["embedding"]
        except Exception as e:
            print(f"Face #{idx}: Embedding generation failed: {e}")
            continue

        best_distance = float("inf")
        best_name = "Unknown"

        for known_emb, name in zip(known_embeddings, known_names):
            dist = cosine_distance(embedding, known_emb)
            if dist < best_distance:
                best_distance = dist
                best_name = name

        final_name = best_name if best_distance <= DISTANCE_THRESHOLD else "Unknown"
        confidence = calculate_confidence(best_distance)
        
        user_id = None
        if final_name != "Unknown":
            user_id = get_user_id_by_name(db, final_name)

        status = "present" if final_name != "Unknown" else "unknown"

        save_attendance_result(
            db=db,
            blob_name=blob_name,
            generation=generation,
            face_index=idx,
            name=final_name,
            user_id=user_id,
            confidence=confidence,
            status=status,
            cosine_distance_value=best_distance
        )

def warm_up_models():
    print("\nWarming up DeepFace models...")
    dummy_img = np.zeros((224, 224, 3), dtype=np.uint8)
    try:
        DeepFace.extract_faces(img_path=dummy_img, detector_backend=DETECTOR, enforce_detection=False)
        DeepFace.represent(img_path=dummy_img, model_name=MODEL_NAME, detector_backend="skip", enforce_detection=False)
    except Exception:
        pass
    print("Models successfully warmed up!")

def start_polling(db, bucket):
    warm_up_models()
    
    print("Scanning Firebase Storage for existing images...")
    known_blob_ids = set()
    try:
        blobs = bucket.list_blobs(prefix=FIREBASE_IMAGE_FOLDER)
        for blob in blobs:
            if not blob.name.endswith("/") and blob.name.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
                known_blob_ids.add(f"{blob.name}_{blob.generation}")
    except Exception as e:
        print(f"Failed to scan existing images: {e}")
        
    print(f"{len(known_blob_ids)} existing image(s) marked as seen. Monitoring for new images...")

    while True:
        try:
            firebase_images = get_firebase_images(bucket, known_blob_ids)
            if firebase_images:
                known_embeddings, known_names = fetch_known_embeddings(db)
                print(f"New Firebase images found: {len(firebase_images)}")
                
                for firebase_item in firebase_images:
                    blob_key = f"{firebase_item['blob_name']}_{firebase_item['generation']}"
                    known_blob_ids.add(blob_key)
                    process_firebase_image(
                        db=db,
                        known_embeddings=known_embeddings,
                        known_names=known_names,
                        firebase_item=firebase_item
                    )
            time.sleep(CHECK_INTERVAL_SECONDS)
        except Exception as e:
            print(f"Polling error: {e}")
            time.sleep(CHECK_INTERVAL_SECONDS)