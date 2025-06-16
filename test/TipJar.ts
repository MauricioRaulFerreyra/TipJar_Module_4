// npx hardhat test test/TipJar.ts

import { expect } from "chai";
import { ethers } from "hardhat";
import type { Contract, ContractFactory } from "ethers";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TipJar Contract", function () {
  let TipJarFactory: ContractFactory;
  let tipJar: any | Contract;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;

  // Valores de prueba
  const TIP_AMOUNT = ethers.parseEther("0.1");
  const LARGE_TIP_AMOUNT = ethers.parseEther("0.2");
  const TEST_MESSAGE = "Test message";

  beforeEach(async function () {
    // Obtener cuentas de prueba
    [owner, addr1, addr2] = await ethers.getSigners();

    // Desplegar nuevo contrato antes de cada test
    TipJarFactory = await ethers.getContractFactory("TipJar");
    tipJar = await TipJarFactory.deploy();
    await tipJar.waitForDeployment();
  });

  describe("Funcionalidad básica", function () {
    it("Debería aceptar propinas y emitir el evento NewTip con todos los parámetros", async function () {
      const tx = await tipJar.connect(addr1).tip(TEST_MESSAGE, {
        value: TIP_AMOUNT,
      });

      // Solución alternativa para verificar el timestamp
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      // Verificar que se emite el evento con 4 parámetros
      await expect(tx)
        .to.emit(tipJar, "NewTip")
        .withArgs(
          await addr1.getAddress(), // from
          TIP_AMOUNT, // amount
          TEST_MESSAGE, // message
          block?.timestamp // timestamp
        );
    });

    it("Debería rechazar propinas con valor 0 con el mensaje correcto", async function () {
      await expect(
        tipJar.connect(addr1).tip("Empty tip", { value: 0 })
      ).to.be.revertedWith("El monto debe ser mayor que 0");
    });
  });

  describe("Gestión de fondos", function () {
    beforeEach(async function () {
      // Preparar contrato con fondos para estos tests
      await tipJar.connect(addr1).tip(TEST_MESSAGE, {
        value: TIP_AMOUNT,
      });
    });

    it("Debería permitir solo al owner retirar fondos", async function () {
      await expect(tipJar.connect(addr1).withdraw()).to.be.revertedWith(
        "Solo el owner puede retirar"
      );
    });

    it("Debería transferir correctamente los fondos al owner", async function () {
      // Verificar cambio de balance en el contrato y el owner
      await expect(tipJar.connect(owner).withdraw()).to.changeEtherBalances(
        [tipJar, owner],
        [`-${TIP_AMOUNT}`, TIP_AMOUNT]
      );
    });
  });

  describe("Consultas y visibilidad", function () {
    it("Debería actualizar correctamente el balance del contrato", async function () {
      // Balance inicial debe ser 0
      expect(
        await ethers.provider.getBalance(await tipJar.getAddress())
      ).to.equal(0);

      // Enviar propina
      await tipJar.connect(addr2).tip(TEST_MESSAGE, {
        value: LARGE_TIP_AMOUNT,
      });

      // Verificar nuevo balance
      expect(
        await ethers.provider.getBalance(await tipJar.getAddress())
      ).to.equal(LARGE_TIP_AMOUNT);
    });

    it("Debería devolver la dirección del owner correctamente", async function () {
      expect(await tipJar.owner()).to.equal(await owner.getAddress());
    });

    it("Debería almacenar y retornar correctamente las propinas", async function () {
      // Enviar varias propinas
      await tipJar.connect(addr1).tip("Mensaje 1", { value: TIP_AMOUNT });
      await tipJar.connect(addr2).tip("Mensaje 2", { value: LARGE_TIP_AMOUNT });

      // Verificar conteo
      expect(await tipJar.getTipCount()).to.equal(2);

      // Verificar contenido de las propinas
      const allTips = await tipJar.getAllTips();
      expect(allTips[0].tipper).to.equal(await addr1.getAddress());
      expect(allTips[0].message).to.equal("Mensaje 1");
      expect(allTips[0].amount).to.equal(TIP_AMOUNT);

      expect(allTips[1].tipper).to.equal(await addr2.getAddress());
      expect(allTips[1].message).to.equal("Mensaje 2");
      expect(allTips[1].amount).to.equal(LARGE_TIP_AMOUNT);
    });
    it("Debería devolver correctamente las propinas por dirección", async function () {
      // addr1 y addr2 envían propinas
      await tipJar.connect(addr1).tip("Mensaje A", { value: TIP_AMOUNT });
      await tipJar.connect(addr1).tip("Mensaje B", { value: LARGE_TIP_AMOUNT });
      await tipJar.connect(addr2).tip("Mensaje C", { value: TIP_AMOUNT });

      const tipsAddr1 = await tipJar.getTipsByAddress(await addr1.getAddress());
      const tipsAddr2 = await tipJar.getTipsByAddress(await addr2.getAddress());

      expect(tipsAddr1.length).to.equal(2);
      expect(tipsAddr1[0].message).to.equal("Mensaje A");
      expect(tipsAddr1[1].message).to.equal("Mensaje B");

      expect(tipsAddr2.length).to.equal(1);
      expect(tipsAddr2[0].message).to.equal("Mensaje C");
    });
  });
});
