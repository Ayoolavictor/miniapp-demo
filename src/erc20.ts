import { celo, celoSepolia } from "wagmi/chains";

// Minimal ERC20 ABI — only the fragments this app actually calls.
export const ERC20_ABI = [
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

// Native USDT deployments on Celo, per Tether/Celo's official addresses.
// https://docs.celo.org/tooling/contracts/token-contracts
export const USDT_BY_CHAIN: Record<number, `0x${string}`> = {
  [celo.id]: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
  [celoSepolia.id]: "0xd077A400968890Eacc75cdc901F0356c943e4fDb",
};

export const CHAIN_LABEL: Record<number, string> = {
  [celo.id]: "Celo Mainnet",
  [celoSepolia.id]: "Celo Sepolia Testnet",
};
