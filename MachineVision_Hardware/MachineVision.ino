#include "esp_camera.h"
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ===================
// Camera model select
// ===================
#define CAMERA_MODEL_ESP32S3_EYE
#include "camera_pins.h"

// ===================
// WiFi credentials
// ===================
const char* ssid = "HONOR400Lite";
const char* password = "p456z6502";

// ===================
// Firebase credentials
// ===================
#define API_KEY "AIzaSyBeYNwnTYRi9UkuprGD4jV2DMVmQea-_HA"
#define FIREBASE_PROJECT_ID "attendance-system-mv-51ba6" // Added Project ID
#define STORAGE_BUCKET_ID "attendance-system-mv-51ba6.firebasestorage.app"
#define USER_EMAIL "wfh4290@gmail.com"
#define USER_PASSWORD "Abc_1234"

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastUpload = 0;
const unsigned long uploadInterval = 3000; // 3 seconds

void setup() {
  Serial.begin(115200);

  // WiFi connection
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nConnected!");

  // Camera configuration
  camera_config_t configCam;
  configCam.ledc_channel = LEDC_CHANNEL_0;
  configCam.ledc_timer = LEDC_TIMER_0;
  configCam.pin_d0 = Y2_GPIO_NUM;
  configCam.pin_d1 = Y3_GPIO_NUM;
  configCam.pin_d2 = Y4_GPIO_NUM;
  configCam.pin_d3 = Y5_GPIO_NUM;
  configCam.pin_d4 = Y6_GPIO_NUM;
  configCam.pin_d5 = Y7_GPIO_NUM;
  configCam.pin_d6 = Y8_GPIO_NUM;
  configCam.pin_d7 = Y9_GPIO_NUM;
  configCam.pin_xclk = XCLK_GPIO_NUM;
  configCam.pin_pclk = PCLK_GPIO_NUM;
  configCam.pin_vsync = VSYNC_GPIO_NUM;
  configCam.pin_href = HREF_GPIO_NUM;
  configCam.pin_sccb_sda = SIOD_GPIO_NUM;
  configCam.pin_sccb_scl = SIOC_GPIO_NUM;
  configCam.pin_pwdn = PWDN_GPIO_NUM;
  configCam.pin_reset = RESET_GPIO_NUM;
  configCam.pin_xclk = XCLK_GPIO_NUM;
  configCam.xclk_freq_hz = 20000000;
  configCam.pixel_format = PIXFORMAT_JPEG;
  configCam.frame_size = FRAMESIZE_QVGA;
  configCam.jpeg_quality = 12;
  configCam.fb_count = 1;

  if (esp_camera_init(&configCam) != ESP_OK) {
    Serial.println("Camera init failed");
    return;
  }

  // Firebase setup - cleanly assigned credentials
  config.api_key = API_KEY;
  config.service_account.data.project_id = FIREBASE_PROJECT_ID;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  // Assign the callback function for token generation status
  config.token_status_callback = tokenStatusCallback;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  if (millis() - lastUpload > uploadInterval) {
    lastUpload = millis();

    camera_fb_t * fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Camera capture failed");
      return;
    }

    String path = "/images/" + String(millis()) + ".jpg";
    Serial.println("Uploading: " + path);

    // Exactly 6 arguments, matches buffer upload template signature perfectly
    if (Firebase.Storage.upload(&fbdo, STORAGE_BUCKET_ID, fb->buf, fb->len, path.c_str(), "image/jpeg")) {
      Serial.println("Upload success!");
    } else {
      Serial.println("Upload failed: " + fbdo.errorReason());
    }

    esp_camera_fb_return(fb);
  }
}
