const { v4: uuidv4 } = require('uuid');
const keys = require('./keys');

const Web3 = require('web3');
const Transaction = require('ethereumjs-tx').Transaction;

//var web3 = new Web3(new Web3.providers.HttpProvider(
//    `https://ropsten.infura.io/v3/${infuraProjectID}`
//));

function startInstantiateWeb3(infuraProjectID) {
    var web3 = new Web3(new Web3.providers.HttpProvider(
        `https://ropsten.infura.io/v3/${infuraProjectID}`
    ));
    return web3;
}

let web3 = startInstantiateWeb3(keys.infuraProjectID);
//https://ropsten.infura.io/v3/614ccde97fa84d778b2cf1c3a5942d01
/**
 * 
 * @param {string} web3Instance 
 * @param {string} message 
 * @param {string|optional} privateKey 
 * @returns Object
 */
 function signMessage(web3Instance, message, privateKey) {
    return web3Instance.eth.accounts.sign(message, privateKey);

}

function encodeParameters(typesArray, parameters){
  let encoded = web3.eth.abi.encodeParameters(typesArray, parameters);  
  return encoded;
}



function encodeFunction(functionSignature) {
    return web3.eth.abi.encodeFunctionSignature(functionSignature);
}


function encodeSignFunctionCall(v, r, s){
    return web3.eth.abi.encodeFunctionCall({name: 'sign',type: 'function',
        inputs: [{type: 'uint8',name: 'v'},{type: 'bytes32', name: 'r'},{type: 'bytes32', name: 's'}]}, [v, r, s]);
}

function getUUID() {
    return uuidv4();
}



let signed = signMessage(web3, "Hello, World", keys.getSellerPrivateKey());
//console.log(signed + "\n");

let v = '0x1c';
let r = '0x0cf2f87921a59f35033f407a155fd44c8672149788595d8d4a64f6265b986d4f';
let s = '0x65b0194018a4cbec971041952d4b3f6c3bbf9bf2f5b09a668ef6e31924dbc883';

let encoded = encodeSignFunctionCall(v, r, s);
//console.log(encoded + "\n");


//{
//    message: 'Hello, World!',
//    messageHash: '0xc8ee0d506e864589b799a645ddb88b08f5d39e8049f9f702b3b61fa15e55fc73',
//    v: '0x1c',
//    r: '0x0cf2f87921a59f35033f407a155fd44c8672149788595d8d4a64f6265b986d4f',
//    s: '0x65b0194018a4cbec971041952d4b3f6c3bbf9bf2f5b09a668ef6e31924dbc883',
//    signature: '0x0cf2f87921a59f35033f407a155fd44c8672149788595d8d4a64f6265b986d4f65b0194018a4cbec971041952d4b3f6c3bbf9bf2f5b09a668ef6e31924dbc8831c'
//  }



// Read the compiled contract code
// Compile with
// solc SampleContract.sol --combined-json abi,asm,ast,bin,bin-runtime,devdoc,interface,opcodes,srcmap,srcmap-runtime,userdoc > contracts.json
let source = require("../contracts/contracts.json");
//console.log(fg)
//let source = fs.readFileSync("../contracts/contracts.json");
let contracts = source["contracts"];

// ABI description as JSON structure
let abi = JSON.parse(contracts["ClosingMin.sol:ClosingMin"].abi);

// Smart contract EVM bytecode as hex
let code = '0x'+ contracts["ClosingMin.sol:ClosingMin"].bin;



async function sendRaw(web3, rawTx, privKey, common = { chain: 'ropsten', hardfork: 'istanbul' }) { //Todo default has last argument
  const privateKey = Buffer.from(privKey, 'hex');
  const tx = new Transaction(rawTx, common);
  tx.sign(privateKey);
  console.log(tx.verifySignature())
  var serializedTx = tx.serialize().toString('hex');
  //console.log(serializedTx);
  const receipt = await web3.eth.sendSignedTransaction('0x' + serializedTx);
  return  receipt;
}

async function transactionSkeleton(gasLimit, gasPrice, code, value, to, from) {

  //var gasPr = await web3.eth.getGasPrice();
  //console.log("gasPrice " + gasPr + "/n");
  //console.log(web3.utils.toHex(gasPr + 100000000))
  var lrt = await web3.eth.getTransactionCount(from)
  var rawTx = {
    nonce: web3.utils.toHex(lrt + 1),
    gasLimit: gasLimit,
    gasPrice:  web3.utils.toHex(web3.utils.toWei('360', 'gwei')),
    data: code,
    from: from,
    value: '0x00',
    chainId: '0x03'
  };



  return rawTx;
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// We need to wait until any miner has included the transaction
// in a block to get the address of the contract
async function waitBlock(transactionHash) {
  while (true) {
    let receipt = web3.eth.getTransactionReceipt(transactionHash);
    if (receipt && receipt.contractAddress) {
      console.log("Your contract has been deployed at http://testnet.etherscan.io/address/" + receipt.contractAddress);
      console.log("Note that it might take 30 - 90 sceonds for the block to propagate befor it's visible in etherscan.io");
      break;
    }
    console.log("Waiting a mined block to include your contract... currently in block " + web3.eth.blockNumber);
    await sleep(4000);
  }
}


let gasLimit =  web3.utils.toHex(650000);
let gasPrice =  web3.utils.toHex(8800000);
//let value =  web3.toHex(80000000);

    
let encodedParams = encodeParameters(['uint', 'address', 'address', 'bytes32'], [web3.utils.toHex(800000), "0x4dC831d0Fb4251EDB4ba8A1f4857e61aC5f06164",
"0x20106136E144e8A4D4920CD0F368c719E70Bf9DC", "0xf2eeb729e636a8cb783be044acf6b7b1e2c5863735b60d6daae84c366ee87d97"]);

let codeAndArgument = code + encodedParams.substr(2);

web3.eth.defaultAccount = keys.BuyerAddress;

async function start() {
  let rawTx = await transactionSkeleton(gasLimit, gasPrice, codeAndArgument, "0x00", "", keys.BuyerAddress);
  let result = await sendRaw(web3, rawTx, keys.getBuyerPrivateKey());
}

start();

//waitBlock(result.transactionHash);

//let rr = web3.eth.abi.encodeParameters(
  //['uint', 'address', 'address', 'bytes32'],
  //["0xadef", "0x4dC831d0Fb4251EDB4ba8A1f4857e61aC5f06164",
  //"0x20106136E144e8A4D4920CD0F368c719E70Bf9DC", 
  //"0xf2eeb729e636a8cb783be044acf6b7b1e2c5863735b60d6daae84c366ee87d97"])

//console.log(rr)


//Issues with underpriced
//https://twitter.com/infura_io/status/905456925101481984
//https://github.com/ethereum/go-ethereum/issues/14838