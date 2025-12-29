// SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.8.27;
contract CroiletFluush {
    event UpdatedMessages(string oldStr, string newStr);
    string public message;
    constructor (string memory initMessage)
    {
        message = initMessage;
    }

    function Update(string memory newMessage) public{
        string memory oldMsg = message;
        message = newMessage;
        emit UpdatedMessages(oldMsg, newMessage);
    }

    function isOwner(address ownerAddress) public view returns (bool) {
    return ownerAddress == msg.sender;
}
}