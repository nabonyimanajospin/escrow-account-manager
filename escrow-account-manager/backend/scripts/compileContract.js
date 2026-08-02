const path = require('path');
const fs = require('fs');
const solc = require('solc');

function compileEscrowContract() {
  const contractPath = path.join(__dirname, '..', 'contracts', 'EscrowVault.sol');
  const sourceCode = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'EscrowVault.sol': {
        content: sourceCode,
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  };

  console.log('[Compiler] Compiling EscrowVault.sol...');
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatalErrors = output.errors.filter(e => e.severity === 'error');
    if (fatalErrors.length > 0) {
      console.error('[Compiler] Compilation Errors:', fatalErrors);
      throw new Error('Solidity compilation failed');
    }
  }

  const contract = output.contracts['EscrowVault.sol']['EscrowVault'];
  const artifactDir = path.join(__dirname, '..', 'artifacts');
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });

  const artifactData = {
    contractName: 'EscrowVault',
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object,
    compiledAt: new Date().toISOString(),
  };

  const artifactPath = path.join(artifactDir, 'EscrowVault.json');
  fs.writeFileSync(artifactPath, JSON.stringify(artifactData, null, 2));

  console.log(`[Compiler] ✅ EscrowVault.sol compiled successfully! Artifact saved to ${artifactPath}`);
  return artifactData;
}

if (require.main === module) {
  try {
    compileEscrowContract();
  } catch (err) {
    console.error('[Compiler] Error:', err.message);
    process.exit(1);
  }
}

module.exports = { compileEscrowContract };
