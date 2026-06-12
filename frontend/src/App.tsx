import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from 'react-toastify';
import { store } from '@/store';
import { AuthBootstrap } from '@/components/common/AuthBootstrap';
import { AppRoutes } from '@/routes/AppRoutes';
import { AppLaunchFlow } from '@/components/common/AppLaunchFlow';
import { MedicationReminderEngine } from '@/components/common/MedicationReminderEngine';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <Provider store={store}>
      <HelmetProvider>
        <AuthBootstrap />
        <MedicationReminderEngine />
        <BrowserRouter>
          <AppLaunchFlow>
            <AppRoutes />
          </AppLaunchFlow>
        </BrowserRouter>
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      </HelmetProvider>
    </Provider>
  );
}

export default App;
