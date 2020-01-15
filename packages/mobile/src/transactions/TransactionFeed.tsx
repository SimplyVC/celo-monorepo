import ItemSeparator from '@celo/react-components/components/ItemSeparator'
import { ApolloError } from 'apollo-boost'
import gql from 'graphql-tag'
import * as React from 'react'
import { FlatList } from 'react-native'
import { connect } from 'react-redux'
import { TransactionFeedFragment, TransactionType } from 'src/apollo/types'
import { AddressToE164NumberType } from 'src/identity/reducer'
import { Invitees, SENTINEL_INVITE_COMMENT } from 'src/invite/actions'
import { NumberToRecipient } from 'src/recipients/recipient'
import { recipientCacheSelector } from 'src/recipients/reducer'
import { RootState } from 'src/redux/reducers'
import ExchangeFeedItem from 'src/transactions/ExchangeFeedItem'
import NoActivity from 'src/transactions/NoActivity'
import { TransactionStatus } from 'src/transactions/reducer'
import TransferFeedItem from 'src/transactions/TransferFeedItem'
import Logger from 'src/utils/Logger'
import { privateCommentKeySelector } from 'src/web3/selectors'

const TAG = 'transactions/TransactionFeed'

export enum FeedType {
  HOME = 'home',
  EXCHANGE = 'exchange',
}

interface StateProps {
  invitees: Invitees
  commentKey: string | null | undefined
  addressToE164Number: AddressToE164NumberType
  recipientCache: NumberToRecipient
}

export type FeedItem = TransactionFeedFragment & {
  status: TransactionStatus // for standby transactions
}

type Props = {
  kind: FeedType
  loading: boolean
  error: ApolloError | undefined
  data: FeedItem[] | undefined
} & StateProps

const mapStateToProps = (state: RootState): StateProps => ({
  invitees: state.invite.invitees,
  commentKey: privateCommentKeySelector(state),
  addressToE164Number: state.identity.addressToE164Number,
  recipientCache: recipientCacheSelector(state),
})

export class TransactionFeed extends React.PureComponent<Props> {
  static fragments = {
    transaction: gql`
      fragment TransactionFeed on Transaction {
        ...ExchangeItem
        ...TransferItem
      }

      ${ExchangeFeedItem.fragments.exchange}
      ${TransferFeedItem.fragments.transfer}
    `,
  }

  renderItem = (commentKeyBuffer: Buffer | null) => ({
    item: tx,
  }: {
    item: FeedItem
    index: number
  }) => {
    const { addressToE164Number, invitees, recipientCache } = this.props

    if (tx.hasOwnProperty('comment')) {
      // @ts-ignore
      if (tx.comment === SENTINEL_INVITE_COMMENT) {
        if (tx.type === TransactionType.Sent) {
          tx.type = TransactionType.InviteSent
        } else if (tx.type === TransactionType.Received) {
          tx.type = TransactionType.InviteReceived
        }
      }
    }

    switch (tx.__typename) {
      case 'TransactionTransfer':
        return (
          <TransferFeedItem
            invitees={invitees}
            addressToE164Number={addressToE164Number}
            recipientCache={recipientCache}
            commentKey={commentKeyBuffer}
            {...tx}
          />
        )
      case 'TransactionExchange':
        return <ExchangeFeedItem {...tx} />
    }

    return <React.Fragment />
  }

  keyExtractor = (item: TransactionFeedFragment) => {
    return item.hash + item.timestamp.toString()
  }

  render() {
    const { kind, loading, error, data, commentKey } = this.props

    if (error) {
      Logger.error(TAG, 'Failure while loading transaction feed', error)
      return <NoActivity kind={kind} loading={loading} error={error} />
    }

    const commentKeyBuffer = commentKey ? Buffer.from(commentKey, 'hex') : null

    if (data && data.length > 0) {
      return (
        <FlatList
          data={data}
          keyExtractor={this.keyExtractor}
          ItemSeparatorComponent={ItemSeparator}
          renderItem={this.renderItem(commentKeyBuffer)}
        />
      )
    } else {
      return <NoActivity kind={kind} loading={loading} error={error} />
    }
  }
}

export default connect<StateProps, {}, {}, RootState>(mapStateToProps)(TransactionFeed)
