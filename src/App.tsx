import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import UploadPage from "./pages/UploadPage";
import ProcessOverview from "./pages/ProcessOverview";
import ProcessFlowVisualization from "./pages/ProcessFlowVisualization";
import UseCasesCatalog from "./pages/UseCasesCatalog";
import UseCaseDetail from "./pages/UseCaseDetail";
import ROIDashboard from "./pages/ROIDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/process" element={<ProcessOverview />} />
          <Route path="/process-flow" element={<ProcessFlowVisualization />} />
          <Route path="/use-cases" element={<UseCasesCatalog />} />
          <Route path="/use-cases/:id" element={<UseCaseDetail />} />
          <Route path="/roi" element={<ROIDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
