import "./App.css";
import "./styles/index.css";
import { Route, Routes, BrowserRouter } from "react-router";
import Home from "./pages/home";
import Label from "./pages/label";
import PrintLabel from "./pages/printLabel";
import TrackingDelivery from "./pages/trackingDelivery";
import ScanQR from "./pages/scanQR";
import MainLayout from "./layouts/body.jsx";
import LabelPage from "./pages/LabelPage";
import Login from "./pages/login";
import GuestOnly from "./middlewares/guestOnly.jsx";
import RegisterPage from "./pages/register.jsx";
import UpdateData from "./pages/updateData.jsx";
import TrackingCustomerPage from "./pages/trackingCustomer.jsx";
import UpdateCyclePage from "./pages/cycleCustomer.jsx";
import DataTrackingTable from "./components/dataTracking.jsx";
import HistoryPage from "./pages/History.jsx";
import ScanFinishPage from "./pages/scannerFinish.jsx";
import AbsensiPage from "./pages/absensi.jsx";
import MaterialUpload from "./pages/uploadMasterpart.jsx";
import MaterialTable from "./components/tablePartmaterial.jsx";
import RequireAuth from "./middlewares/requireAuth.jsx";
import PageUniqueMaterial from "./pages/materialPage.jsx";
import ProductionHome from "./middlewares/productionOnly.jsx";
import ChangePasswordPage from "./pages/changePWPage.jsx";
import InputSmart from "./components/threePointcheck.jsx";
import TrucksDataUpload from "./pages/uploadMasterTruck.jsx";
import FinishPreparePage from "./pages/scanOD.jsx";
import CustomNotFound from "./layouts/custom-not-found.jsx";
function App() {
  return (
    <>
      <BrowserRouter basename="/trackingDelivery">
        <Routes>
          <Route
            path="/login"
            element={
              <GuestOnly>
                {" "}
                <Login />{" "}
              </GuestOnly>
            }
          />

          <Route path="/" element={<MainLayout />}>
            <Route
              path="/"
              element={
                <ProductionHome>
                  <Home />{" "}
                </ProductionHome>
              }
            />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/label" element={<Label />} />
            <Route path="/masterMaterial" element={<MaterialUpload />} />
            <Route path="/masterMaterial/update" element={<MaterialTable />} />
            <Route
              path="/printLabel"
              element={
                <RequireAuth>
                  <LabelPage />
                </RequireAuth>
              }
            />
            <Route path="/updateDelivery" element={<UpdateData />} />
            <Route
              path="/printLabel/:line"
              element={
                <RequireAuth>
                  <PageUniqueMaterial />
                </RequireAuth>
              }
            />
            <Route
              path="/printLabel/:line/:uniqueCode"
              element={
                <RequireAuth>
                  <PrintLabel />
                </RequireAuth>
              }
            />
            <Route path="/scanQR" element={<ScanQR />} />
            <Route path="/scanQR/:id" element={<InputSmart />} />
            <Route path="/scanFinishPrepare" element={<ScanFinishPage />} />
            <Route
              path="/updateCycle/:customerId"
              element={<UpdateCyclePage />}
            />
            <Route path="/tracking" element={<TrackingDelivery />} />
            <Route
              path="/tracking/:customerId"
              element={<TrackingCustomerPage />}
            />
            <Route
              path="/tracking/:customerId/:cycleNumber"
              element={<DataTrackingTable />}
            />
            <Route path="/absensi" element={<AbsensiPage />} />
            <Route path="/readyToshipping" element={<FinishPreparePage />} />
            <Route path="/masterTruck" element={<TrucksDataUpload />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forget-password" element={<ChangePasswordPage />} />
          </Route>
          <Route path="*" element={<CustomNotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
