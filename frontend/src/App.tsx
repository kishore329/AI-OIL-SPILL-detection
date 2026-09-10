import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import Dashboard    from "./pages/Dashboard";
import Incidents    from "./pages/Incidents";
import DetectSpill  from "./pages/DetectSpill";
import PriorityQueue from "./pages/PriorityQueue";
import MapView      from "./pages/MapView";
import RiskAnalysis from "./pages/RiskAnalysis";
import Resources    from "./pages/Resources";
import CitizenReport from "./pages/CitizenReport";
import CitizenReportsAdmin from "./pages/CitizenReportsAdmin";
import Simulator from "./pages/Simulator";
import AlertsCommandCenter from "./pages/AlertsCommandCenter";
import AIAssistant from "./pages/AIAssistant";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Mobile-first public reporting portal */}
        <Route path="report" element={<CitizenReport />} />

        {/* Command & Control authenticated dashboard layout */}
        <Route element={<AppLayout />}>
          <Route index         element={<Dashboard />} />
          <Route path="incidents"     element={<Incidents />} />
          <Route path="incidents/:id" element={<Incidents />} />
          <Route path="alerts"        element={<AlertsCommandCenter />} />
          <Route path="assistant"     element={<AIAssistant />} />
          <Route path="detect"        element={<DetectSpill />} />
          <Route path="detect-spill"  element={<DetectSpill />} />
          <Route path="priority"  element={<PriorityQueue />} />
          <Route path="map"       element={<MapView />} />
          <Route path="risk"      element={<RiskAnalysis />} />
          <Route path="resources" element={<Resources />} />
          <Route path="reports"   element={<CitizenReportsAdmin />} />
          <Route path="simulator" element={<Simulator />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
