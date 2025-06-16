// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @author Mauricio R. Ferreyra
 */

contract TipJar {
    // Dirección del dueño del contrato
    address public owner;
    
    // Estructura para almacenar la información de cada propina
    struct Tip {
        address tipper;     
        string message;
        uint256 timestamp;
        uint256 amount;
    }

    // Lista global de todas las propinas
    Tip[] public tips;

    // NUEVO: Mapping para almacenar propinas por dirección
    mapping(address => Tip[]) public tipsByAddress;
    
    // Evento emitido cuando se recibe una propina
    event NewTip(
        address indexed from,
        uint256 amount,
        string message,
        uint256 timestamp
    );

    constructor() {
        owner = msg.sender;
    }

    // Función para enviar una propina
    function tip(string memory _message) public payable {
        require(msg.value > 0, "El monto debe ser mayor que 0");

        Tip memory newTip = Tip({
            tipper: msg.sender,
            message: _message,
            timestamp: block.timestamp,
            amount: msg.value
        });

        tips.push(newTip); // Propina global
        tipsByAddress[msg.sender].push(newTip); // Propina por dirección

        emit NewTip(msg.sender, msg.value, _message, block.timestamp);
    }

    // Retirar todos los fondos del contrato (solo el owner)
    function withdraw() public {
        require(msg.sender == owner, "Solo el owner puede retirar");
        payable(owner).transfer(address(this).balance);
    }

    // Obtener todas las propinas
    function getAllTips() public view returns (Tip[] memory) {
        return tips;
    }

    // Obtener todas las propinas enviadas por una dirección específica
    function getTipsByAddress(address _tipper) public view returns (Tip[] memory) {
        return tipsByAddress[_tipper];
    }

    // Obtener la cantidad total de propinas
    function getTipCount() public view returns (uint256) {
        return tips.length;
    }
}
