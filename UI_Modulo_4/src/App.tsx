import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import "./App.css";
import TipJarABI from "./abi/TipJar.json";

// Tipos base más específicos y precisos
interface TipStruct {
  tipper: string;
  message: string;
  timestamp: bigint;
  amount: bigint;
}

type Tip = {
  tipper: string;
  message: string;
  timestamp: bigint;
  amount: bigint;
};

// Tipo para el contrato - usando type assertion más simple
type TipJarContract = ethers.Contract & {
  getAllTips(): Promise<TipStruct[]>;
  tip(
    message: string,
    options: { value: bigint }
  ): Promise<ethers.ContractTransactionResponse>;
  withdraw(): Promise<ethers.ContractTransactionResponse>;
  owner(): Promise<string>;
};

// Constantes de configuración
const CONTRACT_ADDRESS = "0x1fBb196F7009bF40b2Fa2B53DD42521BA4e8535B";
const MIN_TIP_AMOUNT = "0.0001";
const DEFAULT_TIP_AMOUNT = "0.001";

// Estados de la aplicación para mejor organización
interface AppState {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  contract: TipJarContract | null;
  account: string;
  balance: string;
  contractBalance: string;
  ownerAddress: string;
  isOwner: boolean;
}

interface UIState {
  message: string;
  amount: string;
  showTips: boolean;
  loading: boolean;
  error: string | null;
  errorAmount: string;
}

interface TipData {
  allTips: Tip[];
  activeTips: Tip[];
}

function App() {
  // Estados principales usando el patrón de separación de responsabilidades
  const [appState, setAppState] = useState<AppState>({
    provider: null,
    signer: null,
    contract: null,
    account: "",
    balance: "0",
    contractBalance: "0",
    ownerAddress: "",
    isOwner: false,
  });

  const [uiState, setUIState] = useState<UIState>({
    message: "",
    amount: DEFAULT_TIP_AMOUNT,
    showTips: true,
    loading: false,
    error: null,
    errorAmount: "",
  });

  const [tipData, setTipData] = useState<TipData>({
    allTips: [],
    activeTips: [],
  });

  // Utility function para manejar errores
  const handleError = (error: unknown, defaultMessage: string): string => {
    if (error instanceof Error) {
      return error.message;
    }
    return defaultMessage;
  };

  // Validación del monto usando patrón de validación
  const validateTipAmount = (amount: string, balance: string): string => {
    const tipAmount = parseFloat(amount);

    if (isNaN(tipAmount)) {
      return "Ingresa un monto válido";
    }

    if (tipAmount <= 0) {
      return "El monto debe ser mayor que 0";
    }

    if (tipAmount < parseFloat(MIN_TIP_AMOUNT)) {
      return `Monto mínimo: ${MIN_TIP_AMOUNT} ETH`;
    }

    const tipAmountWei = ethers.parseEther(amount);
    const balanceWei = ethers.parseEther(balance);

    if (tipAmountWei > balanceWei) {
      return "Fondos insuficientes";
    }

    return "";
  };

  const connectWallet = async (changeAccount = false) => {
    try {
      setUIState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        errorAmount: "",
      }));

      if (!window.ethereum) {
        throw new Error("Por favor instala MetaMask para usar esta aplicación");
      }

      if (changeAccount) {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      }

      const _provider = new ethers.BrowserProvider(window.ethereum);
      const _signer = await _provider.getSigner();
      const _address = await _signer.getAddress();
      const balanceWei = await _provider.getBalance(_address);

      const _contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        TipJarABI.abi,
        _signer
      ) as TipJarContract;

      const owner = await _contract.owner();
      const contractBalanceWei = await _provider.getBalance(CONTRACT_ADDRESS);

      setAppState({
        provider: _provider,
        signer: _signer,
        contract: _contract,
        account: _address,
        balance: ethers.formatEther(balanceWei),
        contractBalance: ethers.formatEther(contractBalanceWei),
        ownerAddress: owner,
        isOwner: owner.toLowerCase() === _address.toLowerCase(),
      });
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setUIState((prev) => ({
        ...prev,
        error: handleError(err, "Error desconocido"),
      }));
    } finally {
      setUIState((prev) => ({ ...prev, loading: false }));
    }
  };

  const fetchTipsData = useCallback(async () => {
    if (!appState.contract || !appState.provider) return;

    try {
      setUIState((prev) => ({ ...prev, loading: true }));

      const allTips = await appState.contract.getAllTips();
      const contractBalance =
        await appState.provider.getBalance(CONTRACT_ADDRESS);

      // Procesar tips con mejor tipado
      const processedTips: Tip[] = allTips
        .map((tip: TipStruct) => ({
          tipper: tip.tipper,
          message: tip.message,
          timestamp: BigInt(tip.timestamp.toString()),
          amount: BigInt(tip.amount.toString()),
        }))
        .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

      // Calcular tips activos
      let accumulatedBalance = 0n;
      const activeTips: Tip[] = [];

      for (const tip of processedTips) {
        if (accumulatedBalance + tip.amount <= contractBalance) {
          accumulatedBalance += tip.amount;
          activeTips.push(tip);
        } else {
          break;
        }
      }

      setTipData({
        allTips: processedTips,
        activeTips: activeTips,
      });

      // Actualizar balance del contrato
      setAppState((prev) => ({
        ...prev,
        contractBalance: ethers.formatEther(contractBalance),
      }));
    } catch (err) {
      console.error("Error fetching tips:", err);
      setUIState((prev) => ({
        ...prev,
        error: "Error al cargar datos de propinas",
      }));
    } finally {
      setUIState((prev) => ({ ...prev, loading: false }));
    }
  }, [appState.contract, appState.provider]);

  const sendTip = async () => {
    if (!uiState.message || !uiState.amount || !appState.contract) return;

    try {
      setUIState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        errorAmount: "",
      }));

      // Validar monto
      const validationError = validateTipAmount(
        uiState.amount,
        appState.balance
      );
      if (validationError) {
        setUIState((prev) => ({ ...prev, errorAmount: validationError }));
        return;
      }

      // Enviar la propina
      const tipAmountWei = ethers.parseEther(uiState.amount);
      const tx = await appState.contract.tip(uiState.message, {
        value: tipAmountWei,
      });

      await tx.wait();

      // Actualizar estado después del envío
      const newBalance = await appState.provider!.getBalance(appState.account);
      const newContractBalance =
        await appState.provider!.getBalance(CONTRACT_ADDRESS);

      setAppState((prev) => ({
        ...prev,
        balance: ethers.formatEther(newBalance),
        contractBalance: ethers.formatEther(newContractBalance),
      }));

      setUIState((prev) => ({
        ...prev,
        message: "",
        amount: DEFAULT_TIP_AMOUNT,
      }));

      await fetchTipsData();
    } catch (err) {
      console.error("Error sending tip:", err);
      const errorMsg = handleError(err, "Error al enviar propina");

      setUIState((prev) => ({
        ...prev,
        error: errorMsg,
        errorAmount: errorMsg.includes("insufficient funds")
          ? "Fondos insuficientes"
          : "",
      }));
    } finally {
      setUIState((prev) => ({ ...prev, loading: false }));
    }
  };

  const withdraw = async () => {
    if (!appState.contract || !appState.isOwner) return;

    try {
      setUIState((prev) => ({ ...prev, loading: true, error: null }));

      const tx = await appState.contract.withdraw();
      await tx.wait();

      const newContractBalance =
        await appState.provider!.getBalance(CONTRACT_ADDRESS);
      setAppState((prev) => ({
        ...prev,
        contractBalance: ethers.formatEther(newContractBalance),
      }));

      alert("Fondos retirados exitosamente");
    } catch (err) {
      console.error("Error withdrawing funds:", err);
      setUIState((prev) => ({
        ...prev,
        error: handleError(err, "Error al retirar fondos"),
      }));
    } finally {
      setUIState((prev) => ({ ...prev, loading: false }));
    }
  };

  // Handlers para inputs con validación
  const handleAmountChange = (value: string) => {
    if (/^\d*\.?\d{0,18}$/.test(value)) {
      setUIState((prev) => ({
        ...prev,
        amount: value,
        errorAmount: "",
      }));
    }
  };

  const handleMessageChange = (value: string) => {
    setUIState((prev) => ({ ...prev, message: value }));
  };

  const toggleTipsVisibility = () => {
    setUIState((prev) => ({ ...prev, showTips: !prev.showTips }));
  };

  // Effects
  useEffect(() => {
    connectWallet();
  }, []);

  useEffect(() => {
    if (appState.contract && appState.provider) {
      fetchTipsData();
    }
  }, [appState.contract, appState.provider, fetchTipsData]);

  return (
    <div className="container">
      <h1>💸 TipJar</h1>

      {uiState.loading && (
        <div className="loading">
          <svg className="spinner" width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"
            />
          </svg>
          Procesando...
        </div>
      )}

      {uiState.error && <div className="error">Error en el proceso</div>}

      {appState.account ? (
        <>
          <div className="account-info">
            <p>
              <strong>Tu cuenta:</strong> {appState.account}
            </p>
            <p>
              <strong>Balance disponible:</strong> {appState.balance} ETH
            </p>
            <p>
              <strong>Owner del contrato:</strong> {appState.ownerAddress}
            </p>
            <p>
              <strong>Balance del contrato:</strong> {appState.contractBalance}{" "}
              ETH
            </p>
            {appState.isOwner && (
              <p className="owner-badge">⚠ Eres el owner</p>
            )}
            <button
              onClick={() => connectWallet(true)}
              className="switch-account"
              disabled={uiState.loading}
            >
              🔄 Cambiar cuenta
            </button>
          </div>

          <div className="tip-form">
            <input
              type="text"
              placeholder="Escribe un mensaje..."
              value={uiState.message}
              onChange={(e) => handleMessageChange(e.target.value)}
              disabled={uiState.loading}
            />
            <div className="amount-input">
              <input
                type="number"
                placeholder="Monto (ETH)"
                value={uiState.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                disabled={uiState.loading}
                min={MIN_TIP_AMOUNT}
                step="0.0001"
              />
              <span>ETH</span>
            </div>
            {uiState.errorAmount && (
              <div className="error-message">{uiState.errorAmount}</div>
            )}
            <button
              onClick={sendTip}
              disabled={
                !uiState.message ||
                !uiState.amount ||
                uiState.loading ||
                !!uiState.errorAmount
              }
            >
              {uiState.loading ? "Enviando..." : `Enviar ${uiState.amount} ETH`}
            </button>
          </div>

          {appState.isOwner && (
            <button
              className="withdraw"
              onClick={withdraw}
              disabled={uiState.loading}
            >
              {uiState.loading ? "Procesando..." : "💰 Retirar Fondos"}
            </button>
          )}

          <div className="tips-header">
            <h2>🧾 Propinas recibidas</h2>
            <button
              className={`toggle-btn ${uiState.showTips ? "showing" : "hidden"}`}
              onClick={toggleTipsVisibility}
              disabled={uiState.loading}
            >
              {uiState.showTips ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          {uiState.showTips && (
            <>
              {tipData.activeTips.map((tip, index) => (
                <div key={index} className="tip-card">
                  <div className="tip-header">
                    <span className="tipper-address">
                      {`${tip.tipper.substring(0, 6)}...${tip.tipper.substring(38)}`}
                    </span>
                    <span className="tip-amount">
                      ..... {ethers.formatEther(tip.amount.toString())} ETH
                    </span>
                  </div>

                  {tip.message && (
                    <div className="tip-message">"{tip.message}"</div>
                  )}

                  <div className="tip-footer">
                    <strong>
                      {new Date(Number(tip.timestamp) * 1000).toLocaleString()}
                    </strong>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      ) : (
        <button onClick={() => connectWallet()} disabled={uiState.loading}>
          {uiState.loading ? "Conectando..." : "Conectar Wallet"}
        </button>
      )}
    </div>
  );
}

export default App;
