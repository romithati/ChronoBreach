import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileJson, AlertCircle } from 'lucide-react';

export default function LogUploader({ onFileUpload }) {
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          onFileUpload(json);
        } catch (error) {
          alert("Invalid JSON file. Please upload a valid log array.");
        }
      };
      reader.readAsText(file);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'application/json': ['.json'] },
    multiple: false
  });

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950 p-8">
      <div 
        {...getRootProps()} 
        className={`w-full max-w-2xl h-80 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-10 cursor-pointer transition-all duration-300 ${
          isDragActive 
            ? "border-blue-500 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.2)]" 
            : isDragReject
            ? "border-rose-500 bg-rose-500/10"
            : "border-slate-700 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-800/50"
        }`}
      >
        <input {...getInputProps()} />
        
        <div className="bg-slate-800 p-4 rounded-full mb-4 shadow-lg">
          <UploadCloud size={40} className={isDragActive ? "text-blue-400" : "text-slate-400"} />
        </div>
        
        <h3 className="text-xl font-bold text-slate-200 mb-2">
          {isDragActive ? "Drop logs to analyze..." : "Ingest Security Logs"}
        </h3>
        
        <p className="text-slate-400 text-sm text-center max-w-md mb-6">
          Drag and drop your raw network, endpoint, or firewall logs here in JSON format. The AI Engine will automatically parse and reconstruct the threat timeline.
        </p>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-950 px-3 py-1.5 rounded-md border border-slate-800">
          <FileJson size={14} /> Supports .json arrays
        </div>
      </div>
    </div>
  );
}