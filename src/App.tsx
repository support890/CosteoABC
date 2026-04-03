import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ModelProvider } from "@/contexts/ModelContext";
import { BIExpressProvider } from "@/contexts/BIExpressContext";
import { LogisticsProvider } from "@/contexts/LogisticsContext";
import { ForecastProvider } from "@/contexts/ForecastContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LandingPage from "./pages/LandingPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import FeaturePage from "./pages/FeaturePage.tsx";
import ContactPage from "./pages/ContactPage.tsx";
import TermsPage from "./pages/TermsPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import Index from "./pages/Index.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import ModelsPage from "./pages/ModelsPage.tsx";
import DictionariesPage from "./pages/DictionariesPage.tsx";
import AssignmentsPage from "./pages/AssignmentsPage.tsx";
import StrategyPage from "./pages/StrategyPage.tsx";
import AnalyticsPage from "./pages/AnalyticsPage.tsx";
import ReportsPage from "./pages/ReportsPage.tsx";
import ProfitabilityPage from "./pages/ProfitabilityPage.tsx";
import ModelHealthPage from "./pages/ModelHealthPage.tsx";
import PeriodComparisonPage from "./pages/PeriodComparisonPage.tsx";
import CombinedSensitivityPage from "./pages/CombinedSensitivityPage.tsx";
import ExecutiveSummaryPage from "./pages/ExecutiveSummaryPage.tsx";
import DimensionsPage from "./pages/DimensionsPage.tsx";
import CrossAnalysisPage from "./pages/CrossAnalysisPage.tsx";
import BIExpressModelsPage from "./pages/BIExpressModelsPage.tsx";
import BIExpressPage from "./pages/BIExpressPage.tsx";
import BIExpressCatalogPage from "./pages/BIExpressCatalogPage.tsx";
import BIExpressKPISelectorPage from "./pages/BIExpressKPISelectorPage.tsx";
import BIExpressDataPage from "./pages/BIExpressDataPage.tsx";
import LogisticsModelsPage from "./pages/LogisticsModelsPage.tsx";
import LogisticsPage from "./pages/LogisticsPage.tsx";
import ForecastModelsPage from "./pages/ForecastModelsPage.tsx";
import ForecastPage from "./pages/ForecastPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TenantProvider>
      <ModelProvider>
        <BIExpressProvider>
        <LogisticsProvider>
        <ForecastProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/features/:slug" element={<FeaturePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              {/* Protected App */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/models"
                element={
                  <ProtectedRoute>
                    <ModelsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dictionaries"
                element={
                  <ProtectedRoute>
                    <DictionariesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assignments"
                element={
                  <ProtectedRoute>
                    <AssignmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profitability"
                element={
                  <ProtectedRoute>
                    <ProfitabilityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/model-health"
                element={
                  <ProtectedRoute>
                    <ModelHealthPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/period-comparison"
                element={
                  <ProtectedRoute>
                    <PeriodComparisonPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sensitivity"
                element={
                  <ProtectedRoute>
                    <CombinedSensitivityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/executive-summary"
                element={
                  <ProtectedRoute>
                    <ExecutiveSummaryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dimensions"
                element={
                  <ProtectedRoute>
                    <DimensionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cross-analysis"
                element={
                  <ProtectedRoute>
                    <CrossAnalysisPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bi-express"
                element={
                  <ProtectedRoute>
                    <BIExpressModelsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bi-express/dashboard"
                element={
                  <ProtectedRoute>
                    <BIExpressPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bi-express/catalog"
                element={
                  <ProtectedRoute>
                    <BIExpressCatalogPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bi-express/kpi-selector"
                element={
                  <ProtectedRoute>
                    <BIExpressKPISelectorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bi-express/data/:templateId"
                element={
                  <ProtectedRoute>
                    <BIExpressDataPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logistics"
                element={
                  <ProtectedRoute>
                    <LogisticsModelsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logistics/inputs"
                element={
                  <ProtectedRoute>
                    <LogisticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logistics/results"
                element={
                  <ProtectedRoute>
                    <LogisticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logistics/whatif"
                element={
                  <ProtectedRoute>
                    <LogisticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logistics/sensitivity"
                element={
                  <ProtectedRoute>
                    <LogisticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forecast"
                element={
                  <ProtectedRoute>
                    <ForecastModelsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forecast/data"
                element={
                  <ProtectedRoute>
                    <ForecastPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forecast/results"
                element={
                  <ProtectedRoute>
                    <ForecastPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forecast/dashboard"
                element={
                  <ProtectedRoute>
                    <ForecastPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/strategy"
                element={
                  <ProtectedRoute>
                    <StrategyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </ForecastProvider>
        </LogisticsProvider>
        </BIExpressProvider>
      </ModelProvider>
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
