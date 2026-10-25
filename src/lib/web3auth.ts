// @ts-nocheck
"use client";
import { Web3Auth, WEB3AUTH_NETWORK, fromViemChain } from "@web3auth/modal";
import { sepolia } from "viem/chains";

// Prevent multiple instances during hot module reloading in development
let web3authInstance: Web3Auth | null = null;

export function getWeb3AuthInstance(): Web3Auth | null {
  // Only initialize in browser environment
  if (typeof window === "undefined") {
    return null;
  }

  // Return existing instance if already initialized
  if (web3authInstance) {
    return web3authInstance;
  }

  const clientId = process.env.NEXT_PUBLIC_WEB3_AUTH_CLIENT_ID;

  if (!clientId) {
    console.error("Missing Web3Auth client ID");
    return null;
  }

  const rpcKey = process.env.NEXT_PUBLIC_ETH_SEPOLIA_API_KEY;
  const chain = fromViemChain(sepolia);
  if (rpcKey) {
    chain.rpcTarget = `https://rpc.ankr.com/eth_sepolia/${rpcKey}`;
  }

  try {
    web3authInstance = new Web3Auth({
      clientId,
      // Must match the network the project was created on in the Web3Auth dashboard
      web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
      chains: [chain],
      defaultChainId: chain.chainId,
      uiConfig: {
        appName: "Trash2Token",
        mode: "light",
        loginMethodsOrder: ["google"],
      },
    });

    return web3authInstance;
  } catch (error) {
    console.error("Failed to initialize Web3Auth:", error);
    return null;
  }
}

// Initialize Web3Auth
export const initWeb3Auth = async (): Promise<Web3Auth | null> => {
  const web3auth = getWeb3AuthInstance();

  if (!web3auth) {
    return null;
  }

  try {
    await web3auth.init();
    return web3auth;
  } catch (error) {
    console.error("Error initializing Web3Auth:", error);
    return null;
  }
};

// Export an auth context provider for React components
export { useAuthStatus } from "../hooks/useAuthStatus";
