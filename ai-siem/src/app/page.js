"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Activity, 
  ShieldCheck, 
  Terminal, 
  Server, 
  Play, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Wrench, 
  RefreshCw, 
  Download 
} from 'lucide-react';
import AttackGraph from '@/components/AttackGraph';
import LogUploader from '@/components/LogUploader';

export default function Dashboard() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showRemediation, setShowRemediation] = useState(false);
  const [uploadedLogs, setUploadedLogs] = useState(null);

  // Dynamic state populated by FastAPI + Groq
  const [analysisData, setAnalysisData] = useState(null);
  const [timelineSteps, setTimelineSteps] = useState([]);

  const analyzeAndAnimate = async (logsToAnalyze) => {
    if (!logsToAnalyze) return;
    
    setIsAnalyzing(true);
    setShowRemediation(false);
    setAnalysisData(null);
    setTimelineSteps([]);

    try {
      // Call FastAPI Backend Engine
      const res = await fetch("http://localhost:8000/api/analyze-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs: logsToAnalyze }),
      });

      if (!res.ok) throw new Error("FastAPI request failed");

      const data = await res.json();
      setAnalysisData(data);

      if (data.timeline_steps && data.timeline_steps.length > 0) {
        setTimelineSteps(
          data.timeline_steps.map((step, idx) => ({
            id: idx + 1,
            title: step.title,
            desc: step.desc,
            icon: idx === 0 ? <ShieldAlert size={16} className="text-amber-400" /> : <Terminal size={16} className="text-rose-400" />
          }))
        );
      }

      setIsAnalyzing(false);

      // Start step-by-step animation
      setIsPlaying(true);
      setActiveStep(0);
      const totalSteps = data.timeline_steps?.length || 0;

      const interval = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= totalSteps - 1) {
            clearInterval(interval);
            setIsPlaying(false);
            setShowRemediation(true);
            return prev + 1;
          }
          return prev + 1;
        });
      }, 1500);

    } catch (err) {
      console.error("Backend connection failed:", err);
      setIsAnalyzing(false);
      alert("Analysis failed. Please check if your FastAPI backend is running!");
    }
  };

  const handleFileUpload = (jsonData) => {
    setUploadedLogs(jsonData);
    analyzeAndAnimate(jsonData);
  };

  const resetDashboard = () => {
    setUploadedLogs(null);
    setAnalysisData(null);
    setTimelineSteps([]);
    setActiveStep(0);
    setShowRemediation(false);
  };

  const fetchLiveLogs = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/live-logs");
      const data = await res.json();
      if (data.logs && data.logs.length > 0) {
        setUploadedLogs(data.logs);
        analyzeAndAnimate(data.logs);
      } else {
        alert("No new malicious activity detected on the network yet.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to the Live Telemetry server.");
    }
  };

  const generateReport = () => {
    if (!analysisData) return;
    
    const reportContent = `
=========================================================
🚨 AI-SIEM AUTOMATED INCIDENT RESPONSE REPORT 🚨
=========================================================
Generated: ${new Date().toLocaleString()}
Incident ID: #8892 - Ransomware Behavior Detected

[1] EXECUTIVE SUMMARY
---------------------------------------------------------
Patient Zero: ${analysisData.patient_zero}
Critical Escalation: ${analysisData.critical_escalation_point}

[2] TIMELINE OF EVENTS
---------------------------------------------------------
${timelineSteps.map(step => `[Step ${step.id}] ${step.title}\n> ${step.desc}`).join('\n\n')}

[3] ENTITIES COMPROMISED
---------------------------------------------------------
${analysisData.nodes.map(node => `- [${node.type}] ${node.label}`).join('\n')}

[4] ACTIONABLE AI REMEDIATION PLAYBOOK
---------------------------------------------------------
${analysisData.remediation_steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

=========================================================
Report certified by AI-SIEM Core Engine (Groq Llama-3 70B)
=========================================================
    `;

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AI_Incident_Report_${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <ShieldCheck className="text-emerald-400" size={28} />
          <h1 className="font-bold text-lg tracking-tight">AI-SIEM Core</h1>
        </div>
        <nav className="p-4 flex-1">
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="p-3 bg-slate-800/50 rounded-lg text-slate-100 flex items-center gap-3 border border-slate-700">
              <Activity size={18} className="text-blue-400" />
              Active Investigations
            </li>
            <li 
              onClick={resetDashboard}
              className="p-3 hover:bg-slate-800/50 rounded-lg cursor-pointer flex items-center gap-3 transition-colors"
            >
              <Terminal size={18} /> New Log Ingestion
            </li>
          </ul>
        </nav>

        {/* Dynamic Threat Intel Card */}
        {analysisData && (
          <div className="p-4 m-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
            <div className="font-semibold text-rose-400 flex items-center gap-1.5">
              <AlertCircle size={14} /> Patient Zero
            </div>
            <div className="text-slate-300 font-mono bg-slate-900 p-1.5 rounded truncate">
              {analysisData.patient_zero}
            </div>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative">
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center px-6 justify-between backdrop-blur-sm z-20">
          <div>
            <h2 className="text-slate-100 font-semibold">
              {uploadedLogs ? "Incident Analysis Active" : "Waiting for Logs..."}
            </h2>
            <p className="text-xs text-slate-400">Powered by FastAPI, Groq & Llama 3 70B</p>
          </div>
          
          <div className="flex gap-3">
            {/* NEW LIVE TELEMETRY BUTTON */}
            <button 
              onClick={fetchLiveLogs}
              disabled={isAnalyzing || isPlaying}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white px-5 py-2 rounded-md text-sm font-medium transition-all shadow-lg border border-purple-500/30"
            >
              <Activity size={16} /> Scan Network for Live Threats
            </button>
            
            {/* Your existing buttons start here... */}
            {uploadedLogs && (
              <button 
                onClick={() => analyzeAndAnimate(uploadedLogs)}
                disabled={isAnalyzing || isPlaying}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-5 py-2 rounded-md text-sm font-medium transition-all shadow-lg"
              >
                {isAnalyzing ? (
                  <><Loader2 size={16} className="animate-spin text-blue-400" /> Analyzing Logs...</>
                ) : isPlaying ? (
                  "Reconstructing..."
                ) : (
                  <><Play size={16} /> Replay Attack</>
                )}
              </button>
            )}
            
            {uploadedLogs && !isAnalyzing && !isPlaying && (
              <>
                <button 
                  onClick={generateReport}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-all shadow-lg"
                >
                  <Download size={14} /> Export Report
                </button>
                <button 
                  onClick={resetDashboard}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-md text-sm font-medium transition-all"
                >
                  <RefreshCw size={14} /> Clear
                </button>
              </>
            )}
          </div>
        </header>

        {/* Dynamic Center Area: Shows Dropzone OR Graph */}
        <div className="flex-1 relative w-full h-full bg-slate-950 z-0 flex items-center justify-center">
          {!uploadedLogs ? (
            <LogUploader onFileUpload={handleFileUpload} />
          ) : (
            <AttackGraph activeStep={activeStep} dynamicGraph={analysisData} />
          )}
        </div>
      </main>

      {/* RIGHT SIDEBAR: Chronological Timeline */}
      <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col z-20">
        <div className="p-5 border-b border-slate-800">
          <h3 className="font-semibold text-slate-100">Chronological Path</h3>
          <p className="text-xs text-slate-400 mt-1">AI-detected escalation chain</p>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto">
          {!uploadedLogs && (
             <div className="h-full flex items-center justify-center text-slate-500 text-sm text-center">
               Upload logs to generate timeline
             </div>
          )}
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
            <AnimatePresence>
              {timelineSteps.map((step, index) => (
                index <= activeStep && (
                  <motion.div 
                    key={step.id}
                    initial={{ opacity: 0, x: 20, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.4, type: "spring" }}
                    className="relative flex items-center justify-between md:justify-normal group is-active"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-900 text-slate-500 group-[.is-active]:border-blue-500 group-[.is-active]:text-blue-500 shadow shrink-0 z-10">
                      {step.icon}
                    </div>
                    <div className="w-[calc(100%-3rem)] ml-3 p-3.5 rounded border border-slate-800 bg-slate-800/40 backdrop-blur-sm shadow">
                      <div className="font-bold text-slate-200 text-xs mb-0.5">{step.title}</div>
                      <div className="text-slate-400 text-xs leading-relaxed">{step.desc}</div>
                    </div>
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* ACTIONABLE REMEDIATION DRAWER */}
      <AnimatePresence>
        {showRemediation && analysisData?.remediation_steps && (
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            className="absolute bottom-4 left-72 right-88 bg-slate-900/95 border border-slate-700 p-5 rounded-xl backdrop-blur-md shadow-2xl z-30"
          >
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-400 text-sm">
                <Wrench size={16} /> AI Incident Remediation Playbook
              </div>
              <button onClick={() => setShowRemediation(false)} className="text-slate-500 hover:text-slate-300 text-xs">Dismiss</button>
            </div>
            <ul className="grid grid-cols-2 gap-2 text-xs">
              {analysisData.remediation_steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-slate-950 p-2.5 rounded border border-slate-800/80 text-slate-300">
                  <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}