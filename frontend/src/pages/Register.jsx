import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Register() {
  const webcamRef = useRef(null);
  
  const [formData, setFormData] = useState({ name: '', student_id: '' });
  const [imgSrc, setImgSrc] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImgSrc(imageSrc);
  }, [webcamRef]);

  const handleRetake = () => {
    setImgSrc(null);
    setStatus('idle');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imgSrc) {
      setErrorMessage('Please capture a photo first.');
      setStatus('error');
      return;
    }
    if (!formData.name || !formData.student_id) {
      setErrorMessage('Please fill in all fields.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      // The image from react-webcam includes "data:image/jpeg;base64," prefix.
      // We need to send just the base64 string, or the backend expects the raw base64.
      // Let's strip the prefix.
      const base64Data = imgSrc.split(',')[1];
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          student_id: formData.student_id,
          image_base64: base64Data,
        }),
      });

      if (!res.ok) {
        throw new Error('Registration failed');
      }
      
      const data = await res.json();
      if (data.status === 'ok') {
        setStatus('success');
      } else {
        throw new Error(data.error || 'Registration failed');
      }
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-2xl overflow-hidden relative min-h-[600px] w-full max-w-4xl mx-auto shadow-xl border border-slate-200">
      <div className="p-6 border-b border-slate-200 text-center">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Register Face</h2>
        <p className="text-sm text-slate-500 mt-1">Add a new user to the attendance system.</p>
      </div>

      <div className="p-6 flex-1 flex flex-col sm:flex-row gap-8 items-start">
        {/* Camera Section */}
        <div className="flex-1 w-full bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col items-center justify-center overflow-hidden relative min-h-[300px]">
          {!imgSrc ? (
            <>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                className="w-full max-w-sm rounded-lg shadow-sm"
              />
              <button
                onClick={handleCapture}
                className="mt-6 flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-full font-medium transition-colors shadow-sm"
              >
                <Camera className="w-5 h-5" />
                Capture Photo
              </button>
            </>
          ) : (
            <>
              <img src={imgSrc} alt="Captured" className="w-full max-w-sm rounded-lg shadow-sm" />
              <button
                onClick={handleRetake}
                className="mt-6 flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-full font-medium transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Retake Photo
              </button>
            </>
          )}
        </div>

        {/* Form Section */}
        <div className="flex-1 w-full max-w-md space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                placeholder="Jane Doe"
                required
              />
            </div>
            <div>
              <label htmlFor="student_id" className="block text-sm font-medium text-slate-700 mb-1">
                Student / Employee ID
              </label>
              <input
                type="text"
                id="student_id"
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                placeholder="10012345"
                required
              />
            </div>

            {/* Feedback States */}
            {status === 'success' && (
              <div className="p-4 bg-green-50 text-green-800 rounded-lg flex items-start gap-3 border border-green-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Registration Successful!</p>
                  <p className="text-sm text-green-700 mt-1">
                    {formData.name} is now registered in the system.
                  </p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-start gap-3 border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Registration Failed</p>
                  <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || !imgSrc}
              className={`w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-white font-medium transition-colors shadow-sm
                ${
                  status === 'loading' || !imgSrc
                    ? 'bg-accent/60 cursor-not-allowed'
                    : 'bg-accent hover:bg-accent-hover'
                }`}
            >
              {status === 'loading' ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Submit Registration
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
