// npx hardhat run scripts/interactTipJar.ts --network sepolia
// Interactuar con el contrato TipJar en Sepolia
import { ethers } from "ethers";
import "dotenv/config";
import tipJarArtifact from "../artifacts/contracts/TipJar.sol/TipJar.json";

// Configuración
const CONTRACT_ADDRESS =
  process.env.TIPJAR_CONTRACT_ADDRESS ||
  "0x0D2A7cDCffb3B941543765Ca15cc18b3294B69b5";
const ABI = tipJarArtifact.abi;
const TIP_AMOUNT = "0.001"; // Cantidad predeterminada de ETH a enviar

async function main() {
  try {
    // 1. Inicialización del proveedor
    const provider = new ethers.AlchemyProvider(
      "sepolia",
      process.env.ALCHEMY_API_KEY
    );

    // 2. Conexión de wallet
    const wallet = new ethers.Wallet(
      process.env.SEPOLIA_PRIVATE_KEY!,
      provider
    );
    console.log(`🔗 Conectado con la dirección: ${wallet.address}`);

    // 3. Verificar saldo antes de operar
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance disponible: ${balanceEth} ETH`);

    if (balance < ethers.parseEther("0.01")) {
      throw new Error(
        "Saldo insuficiente para cubrir la transacción + gas fees"
      );
    }

    // 4. Instancia del contrato
    const tipJar = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
    console.log(`📜 Contrato TipJar en: ${CONTRACT_ADDRESS}`);

    // 5. Verificar si es owner
    const isOwner =
      (await tipJar.owner()).toLowerCase() === wallet.address.toLowerCase();

    // 6. Enviar propina
    console.log("\n🚀 Enviando propina...");
    const tipTx = await tipJar.tip(
      "Propina enviada desde el script de interacción",
      {
        value: ethers.parseEther(TIP_AMOUNT),
      }
    );
    console.log(`⏳ Esperando confirmación... (TX: ${tipTx.hash})`);
    await tipTx.wait();
    console.log(`✅ Propina de ${TIP_AMOUNT} ETH enviada exitosamente!`);

    // 7. Mostrar balance del contrato
    const contractBalance = await provider.getBalance(CONTRACT_ADDRESS);
    console.log(
      `\n💼 Balance actual del contrato: ${ethers.formatEther(contractBalance)} ETH`
    );

    // 8. Retirar fondos (solo owner)
    if (isOwner) {
      if (contractBalance > 0) {
        console.log("\n🏧 Intentando retirar fondos...");
        const withdrawTx = await tipJar.withdraw();
        console.log(`⏳ Esperando confirmación... (TX: ${withdrawTx.hash})`);
        await withdrawTx.wait();
        console.log(`✅ Fondos retirados exitosamente!`);

        // Mostrar nuevo balance
        const newBalance = await provider.getBalance(CONTRACT_ADDRESS);
        console.log(
          `\n🔄 Nuevo balance del contrato: ${ethers.formatEther(newBalance)} ETH`
        );
      } else {
        console.log("\n⚠️ No hay fondos para retirar");
      }
    } else {
      console.log(
        "\n⛔ No tienes permisos para retirar fondos (no eres el owner)"
      );
    }
  } catch (error) {
    console.error("\n❌ Error durante la ejecución:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
