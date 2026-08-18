import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { ScanFace, CheckCircle2, AlertCircle, RefreshCw, Scan } from 'lucide-react';

export default function Capture() {
  const webcamRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle, scanning, success, no_match, error
  const [resultData, setResultData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleScan = useCallback(async () => {
    if (!webcamRef.current) return;
    
    setStatus('scanning');
    setResultData(null);
    setErrorMessage('');

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Failed to capture from webcam');
      }

      const base64Data = imageSrc.split(',')[1];

      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64Data }),
      });

      if (!res.ok) {
        throw new Error('Failed to connect to server');
      }

      const data = await res.json();
      
      if (data.status === 'recorded') {
        setResultData(data.data);
        setStatus('success');
      } else if (data.status === 'no_match') {
        setStatus('no_match');
      } else if (data.status === 'already_present') {
        setStatus('already_present');
      } else {
        throw new Error(data.error || 'Unknown response from server');
      }

      // Automatically reset after 5 seconds to be ready for next person
      setTimeout(() => {
        setStatus('idle');
      }, 5000);

    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  }, [webcamRef]);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white rounded-2xl overflow-hidden relative min-h-[600px] w-full max-w-3xl mx-auto shadow-2xl">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-10 p-6 bg-gradient-to-b from-slate-900/80 to-transparent text-center pointer-events-none">
        <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
          Attendance Scanner
        </h2>
        <p className="text-slate-300 mt-2 font-medium drop-shadow-sm flex items-center justify-center gap-2">
          Position your face in the frame and scan
        </p>
        <div className="mt-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 pointer-events-auto shadow-sm">
            Demo mode — for testing without hardware
          </span>
        </div>
      </div>

      {/* Main Camera Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "user" }}
          className="w-full h-full object-cover"
        />
        
        {/* Overlay target box */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative">
            {/* Corners */}
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-accent rounded-tl-3xl"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-accent rounded-tr-3xl"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-accent rounded-bl-3xl"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-accent rounded-br-3xl"></div>
          </div>
        </div>

        {/* Scan effect during processing */}
        {status === 'scanning' && (
          <div className="absolute inset-0 bg-accent/20 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
            <Scan className="w-16 h-16 text-white animate-pulse mb-4" />
            <p className="text-xl font-bold text-white animate-pulse">Scanning...</p>
          </div>
        )}

        {/* Result Overlays */}
        {status === 'success' && resultData && (
          <div className="absolute inset-0 bg-green-900/80 flex flex-col items-center justify-center z-30 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-2">{resultData.name}</h3>
              <p className="text-slate-500 mb-6 font-medium">Attendance Recorded</p>
              
              <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">Confidence</span>
                  <span className="font-semibold text-slate-700">
                    {(resultData.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">ID</span>
                  <span className="font-semibold text-slate-700">{resultData.user_id}</span>
                </div>
              </div>
              
              <p className="text-xs text-slate-400">Ready for next scan shortly...</p>
            </div>
          </div>
        )}

        {status === 'no_match' && (
          <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center z-30 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Face Not Recognized</h3>
              <p className="text-slate-500 mb-8">Please try again or register your face.</p>
              
              <button
                onClick={() => setStatus('idle')}
                className="w-full py-3 px-4 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {status === 'already_present' && (
          <div className="absolute inset-0 bg-amber-900/80 flex flex-col items-center justify-center z-30 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-12 h-12 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Already Logged</h3>
              <p className="text-slate-500 mb-8">You have already been marked present today!</p>
              
              <button
                onClick={() => setStatus('idle')}
                className="w-full py-3 px-4 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
              >
                Okay
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center z-30 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">System Error</h3>
              <p className="text-slate-600 mb-8">{errorMessage}</p>
              <button 
                onClick={() => setStatus('idle')}
                className="px-8 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-full font-medium transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black to-transparent flex justify-center z-10">
        <button
          onClick={handleScan}
          disabled={status !== 'idle'}
          className={`flex items-center gap-3 px-12 py-5 rounded-full font-bold text-lg transition-all shadow-2xl
            ${
              status !== 'idle'
                ? 'bg-white/20 text-white/50 cursor-not-allowed transform-none'
                : 'bg-accent hover:bg-accent-hover text-white hover:scale-105 active:scale-95'
            }`}
        >
          {status === 'scanning' ? (
            <RefreshCw className="w-6 h-6 animate-spin" />
          ) : (
            <ScanFace className="w-6 h-6" />
          )}
          {status === 'scanning' ? 'Processing...' : 'Scan Face'}
        </button>
      </div>
    </div>
  );
}
