import { BigNumber } from '@0x/utils';
import { Column, Entity } from 'typeorm';

import { Event } from '@0x/pipeline-utils';
import { bigNumberTransformer } from '@0x/pipeline-utils';

// Event emitted by MixinStake when ZRX is staked.
@Entity({ name: 'stake_events', schema: 'events' })
export class StakeEvent extends Event {
    // The address of the staker.
    @Column({ name: 'staker' })
    public staker!: string;
    // Amount staked
    @Column({ name: 'amount', type: 'numeric', transformer: bigNumberTransformer })
    public amount!: BigNumber;
}
