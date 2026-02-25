// Contract ABI for ConfessAI
// After deploying V2, update CONTRACT_ADDRESS below

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONFESSION_CONTRACT_ADDRESS || process.env.CONFESSION_CONTRACT_ADDRESS || '';

export const CONFESSION_ABI = [
  {
    inputs: [
      { name: '_sinner', type: 'address' },
      { name: '_confessionText', type: 'string' },
      { name: '_sinCategory', type: 'string' },
      { name: '_sinLevel', type: 'string' },
      { name: '_aiResponse', type: 'string' },
    ],
    name: 'confess',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '_id', type: 'uint256' }],
    name: 'getConfession',
    outputs: [
      {
        components: [
          { name: 'sinner', type: 'address' },
          { name: 'confessionText', type: 'string' },
          { name: 'sinCategory', type: 'string' },
          { name: 'sinLevel', type: 'string' },
          { name: 'aiResponse', type: 'string' },
          { name: 'timestamp', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: '_from', type: 'uint256' },
      { name: '_count', type: 'uint256' },
    ],
    name: 'getConfessions',
    outputs: [
      {
        components: [
          { name: 'sinner', type: 'address' },
          { name: 'confessionText', type: 'string' },
          { name: 'sinCategory', type: 'string' },
          { name: 'sinLevel', type: 'string' },
          { name: 'aiResponse', type: 'string' },
          { name: 'timestamp', type: 'uint256' },
        ],
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalConfessions',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'id', type: 'uint256' },
      { indexed: true, name: 'sinner', type: 'address' },
      { indexed: false, name: 'confessionText', type: 'string' },
      { indexed: false, name: 'sinCategory', type: 'string' },
      { indexed: false, name: 'sinLevel', type: 'string' },
      { indexed: false, name: 'aiResponse', type: 'string' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
    name: 'ConfessionPosted',
    type: 'event',
  },
] as const;

// Base chain config
export const BASE_RPC = 'https://mainnet.base.org';
export const BASE_CHAIN_ID = 8453;
export const BASE_EXPLORER = 'https://basescan.org';
