import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.jsx'
import { TooltipProvider } from './components/ui/Tooltip';

createRoot(document.getElementById('root')).render(
  <TooltipProvider>
    <App />
  </TooltipProvider>,
)
