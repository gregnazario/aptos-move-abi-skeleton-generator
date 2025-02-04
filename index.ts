// Get the command line arguments, excluding the first two default arguments
import {Aptos, AptosConfig, MoveFunctionVisibility, Network, NetworkToNetworkName} from "@aptos-labs/ts-sdk";
import * as fs from "node:fs";

const args = process.argv.slice(2);

// TODO: Add argument parsing library

// Arg 1 is the network
const network = args[0];
// Arg 2 is the address
const address = args[1];

// Arg 3 is the module name
const moduleName = args[2];

// Arg 4 is the output file
const outputFile = args[3];


// Set up the client
const APTOS_NETWORK: Network = NetworkToNetworkName[network];
const config = new AptosConfig({network: APTOS_NETWORK});
const aptos = new Aptos(config);

// Fetch the ABI
async function fetchABI() {
    const abi = await aptos.getAccountModule({accountAddress: address, moduleName: moduleName});

    let code = `module ${address.toString()}::${moduleName} {\n`;

    code += `\n    // ======================== Friends ========================\n\n`;
    abi.abi.friends.forEach((friend) => {
        code += `    friend ${friend};\n`;
    });

    code += `\n    // ======================== Structs ========================\n\n`;

    abi.abi.structs.forEach((struct) => {
        code += `    struct ${struct.name} {\n`;
        struct.fields.forEach((field) => {
            code += `        ${field.name}: ${field.type},\n`;
        });
        code += `    }\n\n`;
    });

    code += `    // ======================== Functions ========================\n\n`;
    abi.abi.exposed_functions.forEach((func) => {
        let functionOutput = "";
        if (func.is_view) {
            functionOutput += `    #[view]\n`;
        }
        switch (func.visibility) {
            case MoveFunctionVisibility.PUBLIC:
                functionOutput += `    public `;
                break;
            case MoveFunctionVisibility.FRIEND:
                functionOutput += `    public(friend) `;
                break;
            case MoveFunctionVisibility.PRIVATE:
                break;
        }

        if (func.is_entry) {
            functionOutput += "entry ";
        }
        functionOutput += `fun ${func.name}`;
        let count = 0;
        functionOutput += `(${func.params.map((param) => {
            count++;
            return `param${count}: ${param}`;
        }).join(", ")})${func.return[0] ? `: ${func.return[0]}` : ""} { abort 1 }\n\n`;

        code += functionOutput;
    })

    code += `}\n`;
    fs.writeFileSync(outputFile, code);
}


fetchABI().catch(console.error);