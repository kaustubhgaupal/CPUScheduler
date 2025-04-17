import React, { useState } from "react";

const ALGORITHMS = [
  "FCFS",
  "SJF (Non-Preemptive)",
  "SJF (Preemptive)",
  "Priority (Non-Preemptive)",
  "Priority (Preemptive)",
  "Round Robin"
];

// Color palette for processes
const PROCESS_COLORS = {
  "P1": "#3498db", // Blue
  "P2": "#2ecc71", // Green
  "P3": "#e74c3c", // Red
  "P4": "#9b59b6", // Purple
  "P5": "#f1c40f", // Yellow
  "P6": "#1abc9c", // Teal
  "P7": "#e67e22", // Orange
  "P8": "#34495e", // Dark Blue
  "P9": "#fd79a8", // Pink
  "P10": "#00cec9", // Teal Blue
  "Idle": "#95a5a6" // Gray
};

export default function CPUScheduler() {
  const [processes, setProcesses] = useState([
    { name: "P1", arrivalTime: "0", burstTime: "5", priority: "1" },
    { name: "P2", arrivalTime: "0", burstTime: "2", priority: "3" },
    { name: "P3", arrivalTime: "0", burstTime: "4", priority: "2" }
  ]);
  const [chart, setChart] = useState([]);
  const [algorithm, setAlgorithm] = useState("FCFS");
  const [quantum, setQuantum] = useState(2);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Generate color for a process if not already in the palette
  const getProcessColor = (name) => {
    if (PROCESS_COLORS[name]) return PROCESS_COLORS[name];
    
    // For processes beyond P10, generate a color based on name
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  const handleRun = () => {
    setIsLoading(true);
    
    // Small timeout to allow UI to update before simulation runs
    setTimeout(() => {
      const procs = processes.map(p => ({
        name: p.name,
        arrivalTime: Number(p.arrivalTime) || 0,
        burstTime: Number(p.burstTime) || 0,
        priority: Number(p.priority) || 0,
        originalBurst: Number(p.burstTime) || 0 // Store original burst time for metrics
      }));
  
      let time = 0;
      const gantt = [];
      const remaining = new Map(procs.map(p => [p.name, p.burstTime]));
      const completed = new Set();
      const completionTimes = new Map();
      const waitingTimes = new Map(procs.map(p => [p.name, 0]));
      const turnAroundTimes = new Map();
  
      let ready = [];
      const enqueueArrivalsAt = t => {
        procs.forEach(p => {
          if (p.arrivalTime === t && !completed.has(p.name) && !ready.some(rp => rp.name === p.name)) {
            ready.push(p);
          }
        });
      };
  
      const getComparator = () => {
        switch (algorithm) {
          case "FCFS": return (a, b) => a.arrivalTime - b.arrivalTime;
          case "SJF (Non-Preemptive)":
          case "SJF (Preemptive)": return (a, b) => remaining.get(a.name) - remaining.get(b.name);
          case "Priority (Non-Preemptive)":
          case "Priority (Preemptive)": return (a, b) => a.priority - b.priority;
          default: return null;
        }
      };
      const cmp = getComparator();
  
      let current = null;
      let segmentStart = null;
      const closeSegment = endTime => {
        if (current) {
          gantt.push({ name: current.name, start: segmentStart, end: endTime });
          current = null;
          segmentStart = null;
        }
      };
  
      // Special handling for Round Robin
      if (algorithm === "Round Robin") {
        // Start with all processes that arrive at time 0
        enqueueArrivalsAt(0);
        
        while (completed.size < procs.length) {
          // If ready queue is empty but there are still processes that haven't arrived
          if (ready.length === 0) {
            const upcoming = procs.filter(p => !completed.has(p.name) && p.arrivalTime > time);
            if (upcoming.length === 0) break;
            
            // Add idle time until next process arrives
            const nextArrivalTime = Math.min(...upcoming.map(p => p.arrivalTime));
            gantt.push({ name: "Idle", start: time, end: nextArrivalTime });
            time = nextArrivalTime;
            enqueueArrivalsAt(time);
            continue;
          }
          
          // Get the next process from ready queue (FIFO order for RR)
          const process = ready.shift();
          const remainingTime = remaining.get(process.name);
          
          // Determine how long this process will run
          const executionTime = Math.min(quantum, remainingTime);
          
          // Add to Gantt chart
          gantt.push({ name: process.name, start: time, end: time + executionTime });
          
          // Update remaining time for the process
          remaining.set(process.name, remainingTime - executionTime);
          
          // Check for any new arrivals during this time slice
          for (let t = time + 1; t <= time + executionTime; t++) {
            enqueueArrivalsAt(t);
          }
          
          // Update current time
          time += executionTime;
          
          // Check if process is complete
          if (remaining.get(process.name) <= 0) {
            completed.add(process.name);
            completionTimes.set(process.name, time);
          } else {
            // Put process back in ready queue
            ready.push(process);
          }
        }
      } else {
        // Original logic for other algorithms
        while (completed.size < procs.length) {
          enqueueArrivalsAt(time);
          ready = ready.filter(p => !completed.has(p.name));
  
          if (ready.length === 0) {
            closeSegment(time);
            const upcoming = procs.filter(p => !completed.has(p.name) && p.arrivalTime > time);
            if (upcoming.length === 0) break;
            const nextArrivalTime = Math.min(...upcoming.map(p => p.arrivalTime));
            gantt.push({ name: "Idle", start: time, end: nextArrivalTime });
            time = nextArrivalTime;
            continue;
          }
  
          let next;
          ready.sort(cmp);
          next = ready[0];
          if (["FCFS", "SJF (Non-Preemptive)", "Priority (Non-Preemptive)"].includes(algorithm)) {
            ready.shift();
          }
  
          if (!current || current.name !== next.name) {
            closeSegment(time);
            current = next;
            segmentStart = time;
          }
  
          const slice = ["FCFS", "SJF (Non-Preemptive)", "Priority (Non-Preemptive)"].includes(algorithm)
            ? remaining.get(current.name)
            : 1;
  
          remaining.set(current.name, remaining.get(current.name) - slice);
          for (let t = time + 1; t <= time + slice; t++) enqueueArrivalsAt(t);
          time += slice;
  
          if (remaining.get(current.name) <= 0) {
            completed.add(current.name);
            completionTimes.set(current.name, time);
            closeSegment(time);
          }
        }
      }
  
      // Calculate metrics
      procs.forEach(p => {
        const completionTime = completionTimes.get(p.name);
        const turnAroundTime = completionTime - p.arrivalTime;
        turnAroundTimes.set(p.name, turnAroundTime);
        waitingTimes.set(p.name, turnAroundTime - p.originalBurst);
      });
  
      // Calculate averages
      const avgWaitingTime = Array.from(waitingTimes.values()).reduce((sum, time) => sum + time, 0) / procs.length;
      const avgTurnAroundTime = Array.from(turnAroundTimes.values()).reduce((sum, time) => sum + time, 0) / procs.length;

      // Debug logging for colors
      console.log("Chart segments:", gantt);
      console.log("Process colors:", PROCESS_COLORS);
      gantt.forEach(seg => {
        console.log(`Process ${seg.name} color: ${getProcessColor(seg.name)}`);
      });
      
      setChart(gantt);
      setMetrics({
        completionTimes: Object.fromEntries(completionTimes),
        turnAroundTimes: Object.fromEntries(turnAroundTimes),
        waitingTimes: Object.fromEntries(waitingTimes),
        avgWaitingTime,
        avgTurnAroundTime
      });
      
      setIsLoading(false);
    }, 100);
  };

  const handleChange = (i, field, value) => {
    const stripped = value.replace(/^0+(?=\d)/, "");
    const updated = [...processes];
    updated[i][field] = stripped;
    setProcesses(updated);
  };

  const handleAddProcess = () => {
    const nextId = processes.length + 1;
    setProcesses([...processes, { name: `P${nextId}`, arrivalTime: "0", burstTime: "", priority: "1" }]);
  };

  const handleRemoveProcess = i => {
    setProcesses(processes.filter((_, idx) => idx !== i));
  };

  // Calculate maximum time for proper chart sizing
  const maxTime = chart.length > 0 ? Math.max(...chart.map(seg => seg.end)) : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8 space-y-6">
          <h1 className="text-3xl font-bold text-center text-slate-800">CPU Scheduling Simulator</h1>
          
          {/* Controls */}
          <div className="bg-slate-100 p-5 rounded-lg shadow-sm">
            <div className="flex flex-wrap items-end gap-5">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-slate-700 text-sm font-medium mb-2">Algorithm</label>
                <select
                  value={algorithm}
                  onChange={e => {
                    setAlgorithm(e.target.value);
                    setChart([]);
                    setMetrics(null);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  {ALGORITHMS.map(algo => <option key={algo} value={algo}>{algo}</option>)}
                </select>
              </div>
              {algorithm === "Round Robin" && (
                <div className="w-32">
                  <label className="block text-slate-700 text-sm font-medium mb-2">Quantum</label>
                  <input
                    type="number"
                    min="1"
                    value={quantum}
                    onChange={e => setQuantum(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>
              )}
              <button
                onClick={handleRun}
                disabled={isLoading}
                className={`bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition flex items-center ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Simulating...' : 'Run Simulation'}
              </button>
              <button
                onClick={handleAddProcess}
                className="bg-green-500 hover:bg-green-600 text-white font-medium px-6 py-2 rounded-lg transition"
              >
                Add Process
              </button>
            </div>
          </div>
          
          {/* Process Table */}
          <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Process</th>
                  <th className="px-6 py-3 text-left font-semibold">Arrival Time</th>
                  <th className="px-6 py-3 text-left font-semibold">Burst Time</th>
                  {algorithm.includes("Priority") && 
                    <th className="px-6 py-3 text-left font-semibold">Priority</th>
                  }
                  <th className="px-6 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((p, i) => (
                  <tr key={i} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-3" 
                          style={{backgroundColor: getProcessColor(p.name)}}
                        ></div>
                        {p.name}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="text"
                        value={p.arrivalTime}
                        onChange={e => handleChange(i, "arrivalTime", e.target.value)}
                        className="w-20 border border-slate-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="text"
                        value={p.burstTime}
                        onChange={e => handleChange(i, "burstTime", e.target.value)}
                        className="w-20 border border-slate-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </td>
                    {algorithm.includes("Priority") && (
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={p.priority}
                          onChange={e => handleChange(i, "priority", e.target.value)}
                          className="w-20 border border-slate-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </td>
                    )}
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleRemoveProcess(i)}
                        disabled={processes.length <= 1}
                        className={`text-red-600 hover:text-red-800 font-medium ${processes.length <= 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Results Section */}
          {chart.length > 0 && (
            <div className="space-y-6">
              {/* Gantt Chart */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-semibold mb-5 text-slate-800">Gantt Chart</h2>
                <div className="overflow-x-auto">
                  <div className="min-w-max">
                    {/* Process color legend */}
                    <div className="flex flex-wrap gap-4 mb-4">
                      {processes.map((p, i) => (
                        <div key={i} className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded-sm mr-2" 
                            style={{backgroundColor: getProcessColor(p.name)}}
                          ></div>
                          <span className="text-sm">{p.name}</span>
                        </div>
                      ))}
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded-sm mr-2" 
                          style={{backgroundColor: PROCESS_COLORS.Idle}}
                        ></div>
                        <span className="text-sm">Idle</span>
                      </div>
                    </div>
                    
                    {/* Chart Bars */}
                    <div className="flex h-16 items-center">
                      {chart.map((seg, idx) => (
                        <div
                          key={idx}
                          className="relative h-10 flex items-center justify-center text-white text-sm font-medium rounded-md transition-all duration-200"
                          style={{
                            width: `${(seg.end - seg.start) * 40}px`,
                            backgroundColor: getProcessColor(seg.name),
                            minWidth: '40px'
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            {seg.name}
                          </div>
                          <div className="absolute -bottom-7 left-0 text-slate-600 text-xs">
                            {seg.start}
                          </div>
                          {idx === chart.length - 1 && (
                            <div className="absolute -bottom-7 right-0 text-slate-600 text-xs">
                              {seg.end}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Time markers */}
                    <div className="h-8 relative mt-6">
                      <div className="absolute left-0 right-0 top-0 h-px bg-slate-300"></div>
                      {/* Time scale marks */}
                      {Array.from({length: maxTime + 1}).map((_, i) => (
                        <div 
                          key={i}
                          className="absolute top-0 h-2 w-px bg-slate-300"
                          style={{left: `${i * 40}px`}}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Metrics */}
              {metrics && (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                  <h2 className="text-xl font-semibold mb-5 text-slate-800">Performance Metrics</h2>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Process-specific metrics */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold">Process</th>
                            <th className="px-4 py-2 text-center font-semibold">Completion Time</th>
                            <th className="px-4 py-2 text-center font-semibold">Turnaround Time</th>
                            <th className="px-4 py-2 text-center font-semibold">Waiting Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {processes.map((p, i) => (
                            <tr key={i} className="border-t border-slate-200">
                              <td className="px-4 py-2">
                                <div className="flex items-center">
                                  <div 
                                    className="w-3 h-3 rounded-full mr-2" 
                                    style={{backgroundColor: getProcessColor(p.name)}}
                                  ></div>
                                  {p.name}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-center">{metrics.completionTimes[p.name]}</td>
                              <td className="px-4 py-2 text-center">{metrics.turnAroundTimes[p.name]}</td>
                              <td className="px-4 py-2 text-center">{metrics.waitingTimes[p.name]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Summary metrics */}
                    <div className="bg-slate-50 p-4 rounded-lg space-y-4">
                      <h3 className="font-medium text-slate-800">Summary</h3>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-slate-500">Average Waiting Time</div>
                          <div className="text-2xl font-semibold text-slate-800">{metrics.avgWaitingTime.toFixed(2)}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-slate-500">Average Turnaround Time</div>
                          <div className="text-2xl font-semibold text-slate-800">{metrics.avgTurnAroundTime.toFixed(2)}</div>
                        </div>
                        
                        <div className="pt-2">
                          <div className="text-sm text-slate-500">Total Execution Time</div>
                          <div className="text-2xl font-semibold text-slate-800">{maxTime}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <footer className="mt-8 text-center text-slate-500 text-sm">
        CPU Scheduling Simulator © {new Date().getFullYear()}
      </footer>
    </div>
  );
}