# TipJar Smart Contract 💰

Un contrato inteligente simple para recibir propinas en Ethereum, desarrollado con Solidity y Hardhat.

## 📋 Descripción

TipJar es un contrato que permite a los usuarios enviar propinas con mensajes personalizados. El propietario del contrato puede retirar los fondos acumulados cuando lo desee.

### Características principales

- ✅ Envío de propinas con mensajes personalizados
- ✅ Almacenamiento de historial de propinas
- ✅ Retiro de fondos exclusivo para el propietario
- ✅ Eventos para tracking de transacciones
- ✅ Validaciones de seguridad básicas

## 🛠️ Tecnologías utilizadas

- **Solidity ^0.8.28** - Lenguaje del contrato
- **Hardhat** - Framework de desarrollo
- **TypeScript** - Scripts e interacciones
- **Ethers.js v6** - Librería de interacción con Ethereum
- **Chai** - Framework de testing

## 📦 Instalación

### Prerequisitos

- Node.js >= 16.0.0
- npm o yarn
- Cuenta en Alchemy (para red Sepolia)
- Wallet con SepoliaETH para testing

### Pasos de instalación

1. **Clonar el repositorio**

```bash
git clone <url-del-repositorio>
cd tipjar-contract
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**
   Crear archivo `.env` en la raíz del proyecto:

```env
# API Key de Alchemy para Sepolia
ALCHEMY_API_KEY=tu_alchemy_api_key_aqui

# Private key de tu wallet (NUNCA compartir)
SEPOLIA_PRIVATE_KEY=tu_private_key_aqui

# Dirección del contrato desplegado (actualizar después del deploy)
TIPJAR_CONTRACT_ADDRESS=direccion_del_contrato_desplegado
```

⚠️ **IMPORTANTE**: Nunca subas el archivo `.env` a control de versiones

## 🔧 Configuración de Red Sepolia

### 1. Obtener SepoliaETH

- Visita un faucet de Sepolia: [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- Conecta tu wallet y solicita ETH de prueba
- Confirma que tienes al menos 0.01 SepoliaETH

### 2. Configurar Alchemy

- Crea una cuenta en [Alchemy](https://alchemy.com/)
- Crea una nueva app para la red Sepolia
- Copia la API Key al archivo `.env`

### 3. Configurar Wallet

- Exporta la private key de tu wallet de prueba
- Añádela al archivo `.env` (sin el prefijo 0x)

## 🚀 Uso del Proyecto

### Compilación

```bash
# Compilar contratos
npx hardhat compile
```

### Testing

```bash
# Ejecutar todos los tests
npx hardhat test

# Ejecutar test específico
npx hardhat test test/TipJar.ts

# Ejecutar tests con reporte de gas
npx hardhat test --gas-reporter
```

### Despliegue

#### Red Local (Hardhat Network)

```bash
# Iniciar nodo local
npx hardhat node

# En otra terminal, desplegar
npx hardhat run scripts/deploy.ts --network localhost
```

#### Red Sepolia

```bash
# Desplegar en Sepolia
npx hardhat run scripts/deploy.ts --network sepolia
```

**Importante**: El script de despliegue te mostrará la dirección del contrato desplegado. Copia esta dirección para el siguiente paso.

### Interacción con el Contrato

#### Configuración previa

Después del despliegue, debes actualizar la dirección del contrato en `scripts/interactTipJar.ts`:

```typescript
// Actualizar esta línea con la dirección obtenida del despliegue
const contractAddress = "TU_DIRECCION_DE_CONTRATO_AQUI";
```

**Alternativa recomendada**: Usar variable de entorno en tu `.env`:

```env
TIPJAR_CONTRACT_ADDRESS=tu_direccion_de_contrato_aqui
```

Y modificar el script para usar:

```typescript
const contractAddress =
  process.env.TIPJAR_CONTRACT_ADDRESS || "dirección_por_defecto";
```

#### Ejecutar Script de Interacción

```bash
# Interactuar con contrato desplegado en Sepolia
npx hardhat run scripts/interactTipJar.ts --network sepolia
```

#### Funciones disponibles en el script

- **Verificar conexión**: Muestra dirección de wallet conectada
- **Validar saldo**: Verifica fondos suficientes antes de operar
- **Enviar propina**: Envía 0.001 ETH con mensaje personalizado
- **Consultar balance**: Muestra fondos acumulados en el contrato
- **Retirar fondos**: Solo disponible para el propietario del contrato

## 🔄 Flujo de Trabajo Completo

### 1. Primera vez (Despliegue)

```bash
# Compilar contratos
npx hardhat compile

# Ejecutar tests
npx hardhat test

# Desplegar en Sepolia
npx hardhat run scripts/deploy.ts --network sepolia

# Copiar la dirección mostrada y actualizar interactTipJar.ts
```

### 2. Interacciones posteriores

```bash
# Interactuar con el contrato ya desplegado
npx hardhat run scripts/interactTipJar.ts --network sepolia
```

## 📝 Estructura del Proyecto

```
tipjar-contract/
├── contracts/
│   └── TipJar.sol              # Contrato principal
├── test/
│   └── TipJar.ts              # Tests del contrato
├── scripts/
│   ├── deploy.ts              # Script de despliegue
│   └── interactTipJar.ts      # Script de interacción
├── artifacts/                 # Archivos compilados
├── hardhat.config.ts         # Configuración de Hardhat
├── package.json
├── .env                      # Variables de entorno
└── README.md
```

## 🧪 Casos de Prueba

Los tests cubren los siguientes escenarios:

### Funcionalidad Básica

- ✅ Aceptar propinas y emitir eventos
- ✅ Rechazar propinas con valor 0
- ✅ Verificar parámetros del evento NewTip

### Gestión de Fondos

- ✅ Restricción de retiro solo para owner
- ✅ Transferencia correcta de fondos

### Consultas y Visibilidad

- ✅ Actualización del balance del contrato
- ✅ Verificación de la dirección del owner
- ✅ Almacenamiento y recuperación de propinas

## 🔍 Comandos Útiles

```bash
# Verificar configuración de redes
npx hardhat config

# Limpiar artifacts
npx hardhat clean

# Obtener cuentas disponibles
npx hardhat accounts

# Verificar contrato en Etherscan (Sepolia)
npx hardhat verify --network sepolia DIRECCION_CONTRATO

# Mostrar tamaño de contratos
npx hardhat size-contracts

# Ejecutar console interactiva
npx hardhat console --network sepolia
```

## 🔐 Funciones del Contrato

### Funciones Públicas

- `tip(string memory _message)` - Enviar propina con mensaje
- `getAllTips()` - Obtener todas las propinas
- `getTipCount()` - Obtener número total de propinas
- `owner()` - Obtener dirección del propietario

### Funciones Restringidas

- `withdraw()` - Retirar fondos (solo owner)

### Eventos

- `NewTip(address indexed from, uint256 amount, string message, uint256 timestamp)`

## ⚠️ Consideraciones de Seguridad

- **Private Keys**: Nunca expongas claves privadas en código
- **Fondos de Prueba**: Usa solo ETH de prueba en Sepolia
- **Validaciones**: El contrato incluye validaciones básicas
- **Owner Rights**: Solo el owner puede retirar fondos

## 🐛 Solución de Problemas

### Error: "insufficient funds"

- Verifica que tienes SepoliaETH suficiente
- Confirma que la dirección de tu wallet tiene fondos

### Error: "invalid api key"

- Verifica tu API key de Alchemy en `.env`
- Confirma que la app está configurada para Sepolia

### Error: "nonce too high"

- Resetea la cuenta en MetaMask (Settings > Advanced > Reset Account)

### Error: "contract not deployed"

- Verifica que hayas ejecutado el script de despliegue primero
- Confirma que la dirección del contrato en `interactTipJar.ts` sea correcta
- Asegúrate de estar usando la red correcta (sepolia)

### Error: "call exception"

- El contrato podría no estar desplegado en esa dirección
- Verifica que el ABI coincida con el contrato desplegado
- Confirma que estás usando la dirección correcta del contrato

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles.

## 👨‍💻 Autor

**Mauricio R. Ferreyra** - Práctico Módulo 4

---

## 📚 Recursos Adicionales

- [Documentación de Hardhat](https://hardhat.org/docs)
- [Guía de Solidity](https://docs.soliditylang.org/)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Sepolia Testnet Explorer](https://sepolia.etherscan.io/)

¿Encontraste un bug o tienes una sugerencia? ¡Abre un issue!
