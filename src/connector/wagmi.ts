import { createConfig, http } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// MiniPay only runs on Celo. Celo Sepolia is the current public testnet —
// Alfajores still exists but is deprecated in favor of it, so we target
// Sepolia here for pre-mainnet testing.
//
// `injected()` is what picks up MiniPay's in-app browser provider as well
// as a regular extension wallet (MetaMask etc.) when you're testing this
// in a normal desktop browser instead of inside the MiniPay app.
export const config = createConfig({
  chains: [celo, celoSepolia],
  connectors: [injected()],
  transports: {
    [celo.id]: http(),
    [celoSepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
