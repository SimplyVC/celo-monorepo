import Web3 from 'web3'
import { Escrow } from './types/Escrow'

const ABI = [
  {
    constant: true,
    inputs: [],
    name: 'initialized',
    outputs: [
      {
        name: '',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      {
        name: '',
        type: 'address',
      },
    ],
    name: 'escrowedPayments',
    outputs: [
      {
        name: 'recipientIdentifier',
        type: 'bytes32',
      },
      {
        name: 'sender',
        type: 'address',
      },
      {
        name: 'token',
        type: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
      },
      {
        name: 'sentIndex',
        type: 'uint256',
      },
      {
        name: 'receivedIndex',
        type: 'uint256',
      },
      {
        name: 'timestamp',
        type: 'uint256',
      },
      {
        name: 'expirySeconds',
        type: 'uint256',
      },
      {
        name: 'minAttestations',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'registry',
    outputs: [
      {
        name: '',
        type: 'address',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'owner',
    outputs: [
      {
        name: '',
        type: 'address',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'isOwner',
    outputs: [
      {
        name: '',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      {
        name: '',
        type: 'bytes32',
      },
      {
        name: '',
        type: 'uint256',
      },
    ],
    name: 'receivedPaymentIds',
    outputs: [
      {
        name: '',
        type: 'address',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      {
        name: 'registryAddress',
        type: 'address',
      },
    ],
    name: 'setRegistry',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      {
        name: '',
        type: 'address',
      },
      {
        name: '',
        type: 'uint256',
      },
    ],
    name: 'sentPaymentIds',
    outputs: [
      {
        name: '',
        type: 'address',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      {
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        name: 'identifier',
        type: 'bytes32',
      },
      {
        indexed: true,
        name: 'token',
        type: 'address',
      },
      {
        indexed: false,
        name: 'value',
        type: 'uint256',
      },
      {
        indexed: false,
        name: 'paymentId',
        type: 'address',
      },
      {
        indexed: false,
        name: 'minAttestations',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'identifier',
        type: 'bytes32',
      },
      {
        indexed: true,
        name: 'to',
        type: 'address',
      },
      {
        indexed: true,
        name: 'token',
        type: 'address',
      },
      {
        indexed: false,
        name: 'value',
        type: 'uint256',
      },
      {
        indexed: false,
        name: 'paymentId',
        type: 'address',
      },
    ],
    name: 'Withdrawal',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'identifier',
        type: 'bytes32',
      },
      {
        indexed: true,
        name: 'by',
        type: 'address',
      },
      {
        indexed: true,
        name: 'token',
        type: 'address',
      },
      {
        indexed: false,
        name: 'value',
        type: 'uint256',
      },
      {
        indexed: false,
        name: 'paymentId',
        type: 'address',
      },
    ],
    name: 'Revocation',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'registryAddress',
        type: 'address',
      },
    ],
    name: 'RegistrySet',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    constant: false,
    inputs: [
      {
        name: 'registryAddress',
        type: 'address',
      },
    ],
    name: 'initialize',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      {
        name: 'identifier',
        type: 'bytes32',
      },
      {
        name: 'token',
        type: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
      },
      {
        name: 'expirySeconds',
        type: 'uint256',
      },
      {
        name: 'paymentId',
        type: 'address',
      },
      {
        name: 'minAttestations',
        type: 'uint256',
      },
    ],
    name: 'transfer',
    outputs: [
      {
        name: '',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      {
        name: 'paymentId',
        type: 'address',
      },
      {
        name: 'v',
        type: 'uint8',
      },
      {
        name: 'r',
        type: 'bytes32',
      },
      {
        name: 's',
        type: 'bytes32',
      },
    ],
    name: 'withdraw',
    outputs: [
      {
        name: '',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      {
        name: 'paymentId',
        type: 'address',
      },
    ],
    name: 'revoke',
    outputs: [
      {
        name: '',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      {
        name: 'identifier',
        type: 'bytes32',
      },
    ],
    name: 'getReceivedPaymentIds',
    outputs: [
      {
        name: '',
        type: 'address[]',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      {
        name: 'sender',
        type: 'address',
      },
    ],
    name: 'getSentPaymentIds',
    outputs: [
      {
        name: '',
        type: 'address[]',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
]

export default function getInstance(web3: Web3, address: string): Escrow {
  return new web3.eth.Contract(ABI, address) as any
}
