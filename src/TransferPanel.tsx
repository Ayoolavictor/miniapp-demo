import { useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { celo, celoSepolia } from "wagmi/chains";
import { isAddress, formatUnits, parseUnits } from "viem";
import { config } from "./connector/wagmi";
import { ERC20_ABI, USDT_BY_CHAIN, CHAIN_LABEL } from "./erc20";

type LogEntry = { id: number; time: string; text: string; kind: "info" | "success" | "error" };
let logId = 0;

const SUPPORTED_CHAIN_IDS: number[] = [celo.id, celoSepolia.id];

export default function TransferPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect } = useConnect();
  const { switchChain } = useSwitchChain();

  const onSupportedChain = SUPPORTED_CHAIN_IDS.includes(chainId);

  // Re-point the token field at the right deployment whenever the network
  // changes. This adjusts state during render (the pattern React recommends
  // for "reset state when a prop changes") instead of doing it in an effect.
  const [tokenAddress, setTokenAddress] = useState(
    USDT_BY_CHAIN[chainId] ?? USDT_BY_CHAIN[celo.id]
  );
  const [syncedChainId, setSyncedChainId] = useState(chainId);
  if (chainId !== syncedChainId) {
    setSyncedChainId(chainId);
    setTokenAddress(USDT_BY_CHAIN[chainId] ?? USDT_BY_CHAIN[celo.id]);
  }

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  const pushLog = (text: string, kind: LogEntry["kind"] = "info") =>
    setLog((prev) => [{ id: logId++, time: new Date().toLocaleTimeString(), text, kind }, ...prev].slice(0, 30));

  const tokenValid = isAddress(tokenAddress);

  const { data: symbol } = useReadContract({
    address: tokenValid ? tokenAddress : undefined,
    abi: ERC20_ABI,
    functionName: "symbol",
    chainId,
    query: { enabled: tokenValid },
  });

  const { data: decimals } = useReadContract({
    address: tokenValid ? tokenAddress : undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    chainId,
    query: { enabled: tokenValid },
  });

  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: tokenValid ? tokenAddress : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: tokenValid && !!address },
  });

  const balance = decimals !== undefined && rawBalance !== undefined
    ? formatUnits(rawBalance, decimals)
    : null;

  const { writeContract, isPending } = useWriteContract();

  const canSend = useMemo(
    () =>
      isConnected &&
      onSupportedChain &&
      isAddress(recipient) &&
      decimals !== undefined &&
      Number(amount) > 0 &&
      !isPending &&
      !isConfirming,
    [isConnected, onSupportedChain, recipient, decimals, amount, isPending, isConfirming]
  );

  const handleSend = () => {
    if (decimals === undefined || !isAddress(recipient)) return;
    pushLog(`Submitting transfer of ${amount} ${symbol ?? "tokens"} to ${shorten(recipient)}…`);
    writeContract(
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [recipient, parseUnits(amount, decimals)],
        chainId,
        // Celo lets you pay gas in a stablecoin instead of CELO so a wallet
        // that only holds USDT can still transact — add a `feeCurrency`
        // here once you've confirmed the right allowlisted address/adapter
        // for this chain via `celocli network:whitelist`.
      },
      {
        onSuccess: async (hash) => {
          pushLog(`Transaction submitted: ${shorten(hash, 10)}`, "info");
          setIsConfirming(true);
          try {
            const receipt = await waitForTransactionReceipt(config, { hash, chainId });
            pushLog(`Confirmed in block ${receipt.blockNumber}.`, "success");
            refetchBalance();
          } catch (err) {
            pushLog(`Confirmation failed: ${describeError(err)}`, "error");
          } finally {
            setIsConfirming(false);
          }
        },
        onError: (err) => pushLog(`Transfer failed: ${describeError(err)}`, "error"),
      }
    );
  };

  return (
    <div className="panels">
      <section className="panel">
        <h1 className="panel-title">Send USDT</h1>
        <p className="panel-hint">
          Auto-connects through MiniPay's injected provider (or any wallet
          extension when testing in a regular browser) and calls{" "}
          <code>transfer()</code> on the USDT contract for whichever Celo
          network you're currently on.
        </p>

        {isConnected && (
          <div className="wallet-chip" style={{ marginBottom: 18 }} title={address}>
            <span className="dot dot-live" />
            <span className="mono">{shorten(address ?? "")}</span>
            <span className="chip-net">{CHAIN_LABEL[chainId] ?? `Chain ${chainId}`}</span>
          </div>
        )}

        {!isConnected && (
          <div className="connect-row">
            <span className="field-error" style={{ marginBottom: 8 }}>
              No wallet connected yet — auto-connect runs on load, but you
              can retry manually below.
            </span>
            {connectors.map((c) => (
              <button key={c.uid} className="btn btn-primary" onClick={() => connect({ connector: c })}>
                Connect {c.name}
              </button>
            ))}
          </div>
        )}

        {isConnected && !onSupportedChain && (
          <div className="ledger" style={{ marginBottom: 18 }}>
            <p className="field-error" style={{ marginBottom: 10 }}>
              MiniPay only runs on Celo. Switch networks to continue.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" onClick={() => switchChain({ chainId: celo.id })}>
                Switch to Celo
              </button>
              <button className="btn btn-primary" onClick={() => switchChain({ chainId: celoSepolia.id })}>
                Switch to Celo Sepolia
              </button>
            </div>
          </div>
        )}

        <label className="field">
          <span className="field-label">USDT contract ({CHAIN_LABEL[chainId] ?? `chain ${chainId}`})</span>
          <input
            className="input mono"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value.trim() as `0x${string}`)}
            spellCheck={false}
          />
          {!tokenValid && <span className="field-error">Not a valid address.</span>}
        </label>

        <div className="ledger">
          <div className="ledger-row">
            <span className="ledger-label">Token</span>
            <span className="mono">{symbol ?? "—"}{decimals !== undefined ? ` · ${decimals} decimals` : ""}</span>
          </div>
          <div className="ledger-row">
            <span className="ledger-label">Your balance</span>
            <span className="mono">{isConnected ? (balance ?? "…") : "connect wallet"}</span>
          </div>
        </div>

        <label className="field">
          <span className="field-label">Recipient address</span>
          <input
            className="input mono"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.trim())}
            placeholder="0x…"
            spellCheck={false}
          />
          {recipient && !isAddress(recipient) && <span className="field-error">Not a valid address.</span>}
        </label>

        <label className="field">
          <span className="field-label">Amount ({symbol ?? "USDT"})</span>
          <input
            className="input mono"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
          />
        </label>

        <button className="btn btn-primary btn-send" disabled={!canSend} onClick={handleSend}>
          {isPending && "Waiting for signature…"}
          {!isPending && isConfirming && "Confirming on chain…"}
          {!isPending && !isConfirming && "Send transfer"}
        </button>
      </section>

      <section className="panel panel-log">
        <h2 className="panel-title">Activity</h2>
        {log.length === 0 ? (
          <p className="panel-hint">Nothing yet — submit a transfer to see it here.</p>
        ) : (
          <ul className="log">
            {log.map((entry) => (
              <li key={entry.id} className={`log-row log-${entry.kind}`}>
                <span className="log-time mono">{entry.time}</span>
                <span className="log-text">{entry.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function shorten(value: string, chars = 4): string {
  if (value.length <= chars * 2 + 2) return value;
  return `${value.slice(0, chars + 2)}…${value.slice(-chars)}`;
}

function describeError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { shortMessage?: string; message?: string };
    return e.shortMessage ?? e.message ?? "Unknown error";
  }
  return String(err);
}
