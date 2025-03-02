import { Web3Source, LogPullInfo, ContractCallInfo } from '@0x/pipeline-utils';
import { logger } from '@0x/pipeline-utils';
import { Connection } from 'typeorm';

import { RawLogEntry } from 'ethereum-types';

import { MAX_BLOCKS_TO_SEARCH, START_BLOCK_OFFSET, SCHEMA } from '../../config';
import { LastBlockProcessed } from '../../entities';
const Web3Utils = require('web3-utils');

export interface DeleteOptions {
    isDirectTrade?: boolean;
    directProtocol?: string[];
    protocolVersion?: string;
    nativeOrderType?: string;
}

export class PullAndSaveEventsByTopic {
    public async getParseSaveEventsByTopic<EVENT>(
        connection: Connection,
        web3Source: Web3Source,
        latestBlockWithOffset: number,
        eventName: string,
        tableName: string,
        topics: string[],
        contractAddress: string,
        startSearchBlock: number,
        parser: (decodedLog: RawLogEntry) => EVENT,
        deleteOptions: DeleteOptions,
    ): Promise<void> {
        const startBlock = await this._getStartBlockAsync(
            eventName,
            connection,
            latestBlockWithOffset,
            startSearchBlock,
        );
        const endBlock = Math.min(latestBlockWithOffset, startBlock + (MAX_BLOCKS_TO_SEARCH - 1));

        logger.info(`Searching for ${eventName} between blocks ${startBlock} and ${endBlock}`);

        // assert(topics.length === 1);

        const logPullInfo: LogPullInfo = {
            address: contractAddress,
            fromBlock: startBlock,
            toBlock: endBlock,
            topics,
        };

        const rawLogsArray = await web3Source.getBatchLogInfoForContractsAsync([logPullInfo]);

        await Promise.all(
            rawLogsArray.map(async rawLogs => {
                const parsedLogs = rawLogs.logs.map((encodedLog: RawLogEntry) => parser(encodedLog));

                if (eventName === 'VIPSwapEvent' && parsedLogs.length > 0) {
                    var contractCallToken0Array = [];
                    var contractCallToken1Array = [];

                    var contractCallProtocolNameArray = [];

                    for (var index in parsedLogs) {
                        const contractCallToken0: ContractCallInfo = {
                            to: (parsedLogs[index] as any).contractAddress,
                            data: '0x0dfe1681',
                        };
                        contractCallToken0Array.push(contractCallToken0);

                        const contractCallToken1: ContractCallInfo = {
                            to: (parsedLogs[index] as any).contractAddress,
                            data: '0xd21220a7',
                        };
                        contractCallToken1Array.push(contractCallToken1);

                        const contractCallProtocolName: ContractCallInfo = {
                            to: (parsedLogs[index] as any).contractAddress,
                            data: '0x06fdde03',
                        };
                        contractCallProtocolNameArray.push(contractCallProtocolName);
                    }
                    const token0 = await web3Source.callContractMethodsAsync(contractCallToken0Array);
                    const token1 = await web3Source.callContractMethodsAsync(contractCallToken1Array);
                    const protocolName = await web3Source.callContractMethodsAsync(contractCallProtocolNameArray);

                    for (var i = 0; i < parsedLogs.length; i++) {
                        const token0_i = '0x' + token0[i].slice(2).slice(token0[i].length == 66 ? 64 - 40 : 0);
                        const token1_i = '0x' + token1[i].slice(2).slice(token1[i].length == 66 ? 64 - 40 : 0);
                        parsedLogs[i].fromToken = parsedLogs[i].fromToken === '0' ? token0_i : token1_i;
                        parsedLogs[i].toToken = parsedLogs[i].toToken === '0' ? token0_i : token1_i;

                        const protocolName_i = Web3Utils.hexToUtf8('0x' + protocolName[i].slice(98))
                            .split('LP')[0]
                            .split(' ')[0]
                            .slice(1);
                        parsedLogs[i].from = protocolName_i.includes('Swap') ? protocolName_i : protocolName_i + 'Swap';
                        parsedLogs[i].directProtocol = protocolName_i.includes('Swap')
                            ? protocolName_i
                            : protocolName_i + 'Swap';
                    }
                }

                logger.info(`Saving ${parsedLogs.length} ${eventName} events`);

                await this._deleteOverlapAndSaveAsync<EVENT>(
                    connection,
                    parsedLogs,
                    startBlock,
                    endBlock,
                    tableName,
                    await this._lastBlockProcessedAsync(eventName, endBlock),
                    deleteOptions,
                );
            }),
        );
    }

    private async _lastBlockProcessedAsync(eventName: string, endBlock: number): Promise<LastBlockProcessed> {
        const lastBlockProcessed = new LastBlockProcessed();
        lastBlockProcessed.eventName = eventName;
        lastBlockProcessed.lastProcessedBlockNumber = endBlock;
        lastBlockProcessed.processedTimestamp = new Date().getTime();
        return lastBlockProcessed;
    }

    private async _getStartBlockAsync(
        eventName: string,
        connection: Connection,
        latestBlockWithOffset: number,
        defaultStartBlock: number,
    ): Promise<number> {
        const queryResult = await connection.query(
            `SELECT last_processed_block_number FROM ${SCHEMA}.last_block_processed WHERE event_name = '${eventName}'`,
        );

        const lastKnownBlock = queryResult[0] || { last_processed_block_number: defaultStartBlock };

        return Math.min(
            Number(lastKnownBlock.last_processed_block_number) + 1,
            latestBlockWithOffset - START_BLOCK_OFFSET,
        );
    }

    private async _deleteOverlapAndSaveAsync<T>(
        connection: Connection,
        toSave: T[],
        startBlock: number,
        endBlock: number,
        tableName: string,
        lastBlockProcessed: LastBlockProcessed,
        deleteOptions: DeleteOptions,
    ): Promise<void> {
        const queryRunner = connection.createQueryRunner();

        let deleteQuery: string;
        if (deleteOptions.isDirectTrade && deleteOptions.directProtocol != undefined) {
            deleteQuery = `DELETE FROM ${SCHEMA}.${tableName} WHERE block_number >= ${startBlock} AND block_number <= ${endBlock} AND direct_protocol IN ('${deleteOptions.directProtocol.join(
                "','",
            )}')`;
        } else {
            if (tableName === 'native_fills' && deleteOptions.protocolVersion != undefined) {
                if (deleteOptions.protocolVersion === 'v4' && deleteOptions.nativeOrderType != undefined) {
                    deleteQuery = `DELETE FROM ${SCHEMA}.${tableName} WHERE block_number >= ${startBlock} AND block_number <= ${endBlock} AND protocol_version = '${
                        deleteOptions.protocolVersion
                    }' AND native_order_type = '${deleteOptions.nativeOrderType}' `;
                } else {
                    deleteQuery = `DELETE FROM ${SCHEMA}.${tableName} WHERE block_number >= ${startBlock} AND block_number <= ${endBlock} AND protocol_version = '${
                        deleteOptions.protocolVersion
                    }'`;
                }
            } else {
                deleteQuery = `DELETE FROM ${SCHEMA}.${tableName} WHERE block_number >= ${startBlock} AND block_number <= ${endBlock}`;
            }
        }

        await queryRunner.connect();

        await queryRunner.startTransaction();
        try {
            // delete events scraped prior to the most recent block range
            await queryRunner.manager.query(deleteQuery);
            await queryRunner.manager.save(toSave);
            await queryRunner.manager.save(lastBlockProcessed);

            // commit transaction now:
            await queryRunner.commitTransaction();
        } catch (err) {
            logger.error(err);
            // since we have errors lets rollback changes we made
            await queryRunner.rollbackTransaction();
        } finally {
            // you need to release query runner which is manually created:
            await queryRunner.release();
        }
    }
}
