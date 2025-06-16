import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../contract/config";

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider;
  }
}

// Interfaces para tipado fuerte
interface Tip {
  tipper: string;
  message: string;
  timestamp: Date;
  amount: string;
}

interface ContractWithFunctions extends ethers.Contract {
  getAllTips: () => Promise<any[]>;
  tip: (
    message: string,
    options: { value: bigint }
  ) => Promise<ethers.ContractTransactionResponse>;
  withdraw: () => Promise<ethers.ContractTransactionResponse>;
  owner: () => Promise<string>;
}

// Variables para cache
let cachedProvider: ethers.BrowserProvider | null = null;
let cachedSigner: ethers.JsonRpcSigner | null = null;

// Verificar instalación de MetaMask
export const isMetaMaskInstalled = (): boolean => {
  return typeof window.ethereum !== "undefined";
};

// Conectar wallet y obtener cuenta
export const connectWallet = async (): Promise<string> => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask no está instalado");
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    return accounts[0];
  } catch (error) {
    console.error("Error al conectar wallet:", error);
    throw new Error("El usuario rechazó la conexión");
  }
};

// Obtener provider (con cache)
export const getProvider = (): ethers.BrowserProvider => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask no está instalado");
  }

  if (!cachedProvider) {
    cachedProvider = new ethers.BrowserProvider(window.ethereum);
  }
  return cachedProvider;
};

// Obtener contrato (versión mejorada)
export const getContract = async (
  withSigner = false
): Promise<ContractWithFunctions> => {
  try {
    const provider = getProvider();

    if (withSigner) {
      if (!cachedSigner) {
        cachedSigner = await provider.getSigner();
      }
      return new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        cachedSigner
      ) as ContractWithFunctions;
    }

    return new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    ) as ContractWithFunctions;
  } catch (error) {
    console.error("Error al obtener contrato:", error);
    throw new Error("No se pudo obtener instancia del contrato");
  }
};

// Enviar propina
export const sendTip = async (
  message: string,
  amountEth: string
): Promise<ethers.ContractTransactionReceipt> => {
  try {
    const contract = await getContract(true);
    const tx = await contract.tip(message, {
      value: ethers.parseEther(amountEth),
    });
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("La transacción no fue confirmada");
    }
    return receipt;
  } catch (error) {
    console.error("Error al enviar propina:", error);
    throw new Error("Error al enviar la propina");
  }
};

// Retirar fondos (solo owner)
export const withdrawTips =
  async (): Promise<ethers.ContractTransactionReceipt> => {
    try {
      const contract = await getContract(true);
      const tx = await contract.withdraw();
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("La transacción no fue confirmada");
      }
      return receipt;
    } catch (error) {
      console.error("Error al retirar fondos:", error);
      throw new Error("Error al retirar los fondos");
    }
  };

// Obtener todas las propinas
export const getAllTips = async (): Promise<Tip[]> => {
  try {
    const contract = await getContract();
    const tips = await contract.getAllTips();

    return tips.map((tip: Tip) => ({
      tipper: tip.tipper,
      message: tip.message,
      timestamp: new Date(Number(tip.timestamp) * 1000),
      amount: ethers.formatEther(tip.amount),
    }));
  } catch (error) {
    console.error("Error al obtener propinas:", error);
    throw new Error("Error al cargar las propinas");
  }
};

// Obtener balance del contrato
export const getContractBalance = async (): Promise<string> => {
  try {
    const provider = getProvider();
    const balance = await provider.getBalance(CONTRACT_ADDRESS);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Error al obtener balance:", error);
    throw new Error("Error al obtener el balance del contrato");
  }
};

// Obtener dirección del owner
export const getOwner = async (): Promise<string> => {
  try {
    const contract = await getContract();
    return await contract.owner();
  } catch (error) {
    console.error("Error al obtener owner:", error);
    throw new Error("Error al obtener la dirección del owner");
  }
};

// Listener para cambios de cuenta
export const setupAccountChangeListener = (
  callback: (account: string | null) => void
): void => {
  if (isMetaMaskInstalled()) {
    window.ethereum.on("accountsChanged", (accounts: string[]) => {
      cachedSigner = null; // Resetear signer al cambiar cuenta
      callback(accounts.length > 0 ? accounts[0] : null);
    });

    // También manejar desconexión
    window.ethereum.on("disconnect", () => {
      cachedSigner = null;
      callback(null);
    });
  }
};

// Eliminar listeners (importante para limpieza)
export const removeListeners = (): void => {
  if (isMetaMaskInstalled()) {
    window.ethereum.removeAllListeners("accountsChanged");
    window.ethereum.removeAllListeners("disconnect");
  }
};
