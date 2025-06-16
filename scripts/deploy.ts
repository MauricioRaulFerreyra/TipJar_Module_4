// npx hardhat run scripts/deploy.ts --network sepolia
// Desplegar el contrato TipJar

import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Iniciando despliegue del contrato TipJar...");

  // 1. Obtener el deployer (primera cuenta)
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Desplegando con la cuenta: ${deployer.address}`);

  // 2. Verificar balance del deployer
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance del deployer: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther("0.01")) {
    throw new Error("❌ Saldo insuficiente para desplegar el contrato");
  }

  // 3. Obtener el ContractFactory
  const TipJarFactory = await ethers.getContractFactory("TipJar");

  // 4. Desplegar el contrato
  console.log("⏳ Desplegando contrato...");
  const tipJar = await TipJarFactory.deploy();

  // 5. Esperar confirmación del despliegue
  await tipJar.waitForDeployment();

  const contractAddress = await tipJar.getAddress();
  console.log(`✅ TipJar desplegado en: ${contractAddress}`);

  // 6. Verificar que el owner es correcto
  const owner = await tipJar.owner();
  console.log(`👤 Owner del contrato: ${owner}`);

  // 7. Mostrar información del despliegue
  console.log("\n📋 Información del despliegue:");
  console.log(`- Dirección del contrato: ${contractAddress}`);
  console.log(`- Owner: ${owner}`);
  console.log(
    `- Red: ${await ethers.provider.getNetwork().then((n) => n.name)}`
  );

  // 8. Guardar la dirección para uso posterior
  console.log(
    "\n💡 Para interactuar con el contrato, actualiza la dirección en interactTipJar.ts:"
  );
  console.log(`const contractAddress = "${contractAddress}";`);

  return contractAddress;
}

// Ejecutar el script
main()
  .then((address) => {
    console.log(`\n🎉 Despliegue completado exitosamente en: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error durante el despliegue:", error);
    process.exitCode = 1;
  });
