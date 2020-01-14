import BigNumber from 'bignumber.js'
import gql from 'graphql-tag'
import * as React from 'react'
import { Query } from 'react-apollo'
import { connect } from 'react-redux'
import {
  MoneyAmount,
  Token,
  TransactionType,
  UserTransactionsQuery,
  UserTransactionsQueryVariables,
} from 'src/apollo/types'
import { CURRENCIES, CURRENCY_ENUM } from 'src/geth/consts'
import { LocalCurrencyCode } from 'src/localCurrency/consts'
import { getLocalCurrencyCode, getLocalCurrencyExchangeRate } from 'src/localCurrency/selectors'
import { RootState } from 'src/redux/reducers'
import { removeStandbyTransaction } from 'src/transactions/actions'
import {
  ExchangeStandby,
  StandbyTransaction,
  TransactionStatus,
  TransferStandby,
} from 'src/transactions/reducer'
import TransactionFeed, { FeedItem, FeedType } from 'src/transactions/TransactionFeed'
import { currentAccountSelector } from 'src/web3/selectors'

interface OwnProps {
  currency: CURRENCY_ENUM
}

interface StateProps {
  address?: string | null
  standbyTransactions: StandbyTransaction[]
  localCurrencyCode: LocalCurrencyCode | null
  localCurrencyExchangeRate: string | null | undefined
}

interface DispatchProps {
  removeStandbyTransaction: typeof removeStandbyTransaction
}

type Props = OwnProps & StateProps & DispatchProps

// See https://github.com/microsoft/TypeScript/issues/16069#issuecomment-565658443
function isPresent<T>(t: T | undefined | null | void): t is T {
  return t !== undefined && t !== null
}

export const TRANSACTIONS_QUERY = gql`
  query UserTransactions($address: Address!, $token: Token!, $localCurrencyCode: String) {
    transactions(address: $address, token: $token, localCurrencyCode: $localCurrencyCode) {
      edges {
        node {
          ...TransactionFeed
        }
      }
    }
  }

  ${TransactionFeed.fragments.transaction}
`

// export type UserTransactionsComponentProps = Omit<
//   ApolloReactComponents.QueryComponentOptions<
//     UserTransactionsQuery,
//     UserTransactionsQueryVariables
//   >,
//   'query'
// > &
//   ({ variables: UserTransactionsQueryVariables; skip?: boolean } | { skip: boolean })

class UserTransactionsComponent extends Query<
  UserTransactionsQuery,
  UserTransactionsQueryVariables
> {}

// const UserTransactionsComponent = (props: UserTransactionsComponentProps) => (
//   <ApolloReactComponents.Query<UserTransactionsQuery, UserTransactionsQueryVariables>
//     query={UserTransactionsDocument}
//     {...props}
//   />
// )

// export type UserTransactionsQueryResult = ApolloReactCommon.QueryResult<
//   UserTransactionsQuery,
//   UserTransactionsQueryVariables
// >

const mapStateToProps = (state: RootState): StateProps => ({
  address: currentAccountSelector(state),
  standbyTransactions: state.transactions.standbyTransactions,
  localCurrencyCode: getLocalCurrencyCode(state),
  localCurrencyExchangeRate: getLocalCurrencyExchangeRate(state),
})

function resolveAmount(
  moneyAmount: Pick<MoneyAmount, 'amount' | 'currencyCode'>,
  localCurrencyCode: LocalCurrencyCode | null,
  exchangeRate: string | null | undefined
) {
  if (!localCurrencyCode || !exchangeRate) {
    return { ...moneyAmount, localAmount: null }
  }

  return {
    ...moneyAmount,
    localAmount: {
      amount: new BigNumber(moneyAmount.amount).multipliedBy(exchangeRate).toString(),
      currencyCode: localCurrencyCode as string,
      exchangeRate,
    },
  }
}

function mapExchangeStandbyToFeedItem(
  standbyTx: ExchangeStandby,
  currency: CURRENCY_ENUM,
  localCurrencyCode: LocalCurrencyCode | null,
  localCurrencyExchangeRate: string | null | undefined
): FeedItem {
  const { type, hash, status, timestamp, inValue, inSymbol, outValue, outSymbol } = standbyTx

  const inAmount = {
    amount: inValue,
    currencyCode: CURRENCIES[inSymbol].code,
  }
  const outAmount = {
    amount: outValue,
    currencyCode: CURRENCIES[outSymbol].code,
  }

  const exchangeRate = new BigNumber(outAmount.amount).dividedBy(inAmount.amount)
  const localExchangeRate = new BigNumber(localCurrencyExchangeRate ?? 0)
  const makerLocalExchangeRate =
    inAmount.currencyCode === localCurrencyCode
      ? localExchangeRate
      : exchangeRate.multipliedBy(localExchangeRate)
  const takerLocalExchangeRate =
    outAmount.currencyCode === localCurrencyCode
      ? localExchangeRate
      : exchangeRate.pow(-1).multipliedBy(localExchangeRate)

  const makerAmount = resolveAmount(inAmount, localCurrencyCode, makerLocalExchangeRate.toString())
  const takerAmount = resolveAmount(outAmount, localCurrencyCode, takerLocalExchangeRate.toString())

  // Find amount relative to the queried currency
  const accountAmount = [makerAmount, takerAmount].find(
    (amount) => amount.currencyCode === CURRENCIES[currency].code
  )

  if (!accountAmount) {
    // This is not supposed to happen
    throw new Error('Unable to find amount relative to the queried currency')
  }

  return {
    __typename: 'TransactionExchange',
    type,
    hash: hash ?? '',
    timestamp,
    status,
    amount: resolveAmount(
      {
        ...accountAmount,
        // Signed amount relative to the queried account currency
        amount: new BigNumber(accountAmount.amount)
          .multipliedBy(accountAmount === makerAmount ? -1 : 1)
          .toString(),
      },
      localCurrencyCode,
      accountAmount.localAmount?.exchangeRate
    ),
    makerAmount,
    takerAmount,
  }
}

function mapTransferStandbyToFeedItem(
  standbyTx: TransferStandby,
  currency: CURRENCY_ENUM,
  localCurrencyCode: LocalCurrencyCode | null,
  localCurrencyExchangeRate: string | null | undefined
): FeedItem {
  const { type, hash, status, timestamp, value, symbol, address, comment } = standbyTx

  return {
    __typename: 'TransactionTransfer',
    type,
    hash: hash ?? '',
    timestamp,
    status,
    amount: resolveAmount(
      {
        // Signed amount relative to the queried account currency
        // Standby transfers are always outgoing
        amount: new BigNumber(value).multipliedBy(-1).toString(),
        currencyCode: CURRENCIES[symbol].code,
      },
      localCurrencyCode,
      localCurrencyExchangeRate
    ),
    comment,
    address,
  }
}

function mapStandbyTransactionToFeedItem(
  currency: CURRENCY_ENUM,
  localCurrencyCode: LocalCurrencyCode | null,
  localCurrencyExchangeRate: string | null | undefined
) {
  return (standbyTx: StandbyTransaction): FeedItem => {
    if (standbyTx.type === TransactionType.Exchange) {
      return mapExchangeStandbyToFeedItem(
        standbyTx,
        currency,
        localCurrencyCode,
        localCurrencyExchangeRate
      )
    }
    // Otherwise it's a transfer
    else {
      return mapTransferStandbyToFeedItem(
        standbyTx,
        currency,
        localCurrencyCode,
        localCurrencyExchangeRate
      )
    }
  }
}

function getTransactions(data: UserTransactionsQuery | undefined) {
  return data?.transactions?.edges.map((edge) => edge.node).filter(isPresent) ?? []
}

export class TransactionsList extends React.PureComponent<Props> {
  txsFetched = (data: UserTransactionsQuery | undefined) => {
    const transactions = getTransactions(data)
    if (transactions.length < 1) {
      return
    }

    const queryDataTxHashes = new Set(transactions.map((tx) => tx?.hash))
    const inQueryTxs = (tx: StandbyTransaction) =>
      tx.hash && queryDataTxHashes.has(tx.hash) && tx.status !== TransactionStatus.Failed
    const filteredStandbyTxs = this.props.standbyTransactions.filter(inQueryTxs)
    filteredStandbyTxs.forEach((tx) => {
      this.props.removeStandbyTransaction(tx.id)
    })
  }

  render() {
    const {
      address,
      currency,
      localCurrencyCode,
      localCurrencyExchangeRate,
      standbyTransactions,
    } = this.props

    const queryAddress = address || ''
    const token = currency === CURRENCY_ENUM.GOLD ? Token.CGld : Token.CUsd

    return (
      <UserTransactionsComponent
        query={TRANSACTIONS_QUERY}
        pollInterval={10000}
        variables={{ address: queryAddress, token, localCurrencyCode }}
        onCompleted={this.txsFetched}
      >
        {({ loading, error, data }) => {
          const transactions = getTransactions(data).map((transaction) => ({
            ...transaction,
            status: TransactionStatus.Complete,
          }))

          // Filter out standby transactions that aren't for the queried currency or are already in the received transactions
          const queryDataTxHashes = new Set(transactions.map((tx) => tx.hash))
          const standbyTxs = standbyTransactions
            .filter((tx) => {
              const isForQueriedCurrency =
                (tx as TransferStandby).symbol === currency ||
                (tx as ExchangeStandby).inSymbol === currency ||
                (tx as ExchangeStandby).outSymbol === currency
              const notInQueryTxs =
                (!tx.hash || !queryDataTxHashes.has(tx.hash)) &&
                tx.status !== TransactionStatus.Failed
              return isForQueriedCurrency && notInQueryTxs
            })
            .map(
              mapStandbyTransactionToFeedItem(
                currency,
                localCurrencyCode,
                localCurrencyExchangeRate
              )
            )

          const feedData = [...standbyTxs, ...transactions]

          return (
            <TransactionFeed kind={FeedType.HOME} loading={loading} error={error} data={feedData} />
          )
        }}
      </UserTransactionsComponent>
    )
  }
}

export default connect<StateProps, DispatchProps, OwnProps, RootState>(mapStateToProps, {
  removeStandbyTransaction,
})(TransactionsList)
