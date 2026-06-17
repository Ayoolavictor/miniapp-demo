// src/App.tsx
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "../src/connector/wagmi";
import { useAutoConnect } from "./hooks/useAutoConnect";
import TransferPanel from "./TransferPanel";

const queryClient = new QueryClient();

function AppContent() {
  useAutoConnect(); // Auto-connect to MiniPay on load

   return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◧</span>
          <span className="brand-text">
            <span className="brand-title">usdt-sender</span>
            <span className="brand-sub">MiniPay test transfer console</span>
          </span>
        </div>
      </header>
      <main className="layout">
        <TransferPanel />
      </main>
      <footer className="footer">
        Built for testing only — double check the contract address and network before sending real funds.
      </footer>
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;