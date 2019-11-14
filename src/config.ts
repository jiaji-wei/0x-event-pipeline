import { 
    DEFAULT_LOCAL_POSTGRES_URI,
    DEFAULT_FIRST_SEARCH_BLOCK,
    DEFAULT_START_BLOCK_OFFSET,
    DEFAULT_MAX_BLOCKS_TO_PULL,
    DEFAULT_MAX_BLOCKS_TO_SEARCH,
    DEFAULT_CHAIN_ID,
    DEFAULT_BLOCK_FINALITY_THRESHOLD,
    DEFAULT_SECONDS_BETWEEN_RUNS,
} from './constants';

const throwError = (err: string) => {
    throw new Error(err);
}

export const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL ? 
    process.env.ETHEREUM_RPC_URL : 
    throwError(`Must specify valid ETHEREUM_RPC_URL. Got: ${process.env.ETHEREUM_RPC_URL}`);
export const POSTGRES_URI = process.env.POSTGRES_URI || DEFAULT_LOCAL_POSTGRES_URI;
export const SHOULD_SYNCHRONIZE = process.env.SHOULD_SYNCHRONIZE === 'true';
export const FIRST_SEARCH_BLOCK = process.env.FIRST_SEARCH_BLOCK ? parseInt(process.env.FIRST_SEARCH_BLOCK, 10) : DEFAULT_FIRST_SEARCH_BLOCK;
export const START_BLOCK_OFFSET = process.env.START_BLOCK_OFFSET ? parseInt(process.env.START_BLOCK_OFFSET, 10) : DEFAULT_START_BLOCK_OFFSET;
export const MAX_BLOCKS_TO_PULL = process.env.MAX_BLOCKS_TO_PULL ? parseInt(process.env.MAX_BLOCKS_TO_PULL, 10) : DEFAULT_MAX_BLOCKS_TO_PULL;
export const MAX_BLOCKS_TO_SEARCH = process.env.MAX_BLOCKS_TO_SEARCH ? parseInt(process.env.MAX_BLOCKS_TO_SEARCH, 10) : DEFAULT_MAX_BLOCKS_TO_SEARCH;
export const CHAIN_ID = process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID, 10) : DEFAULT_CHAIN_ID;
export const BLOCK_FINALITY_THRESHOLD = process.env.BLOCK_FINALITY_THRESHOLD ? parseInt(process.env.BLOCK_FINALITY_THRESHOLD, 10) : DEFAULT_BLOCK_FINALITY_THRESHOLD;
export const SECONDS_BETWEEN_RUNS = process.env.SECONDS_BETWEEN_RUNS ? parseInt(process.env.SECONDS_BETWEEN_RUNS, 10) : DEFAULT_SECONDS_BETWEEN_RUNS;