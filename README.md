## Arbitrage/Trading Bot on Decentralized Exchange
This project is a trading bot that performs safe arbitrages between the orderbooks and liquidity pools on a decentralized exchange of a niche blockchain. 

As of 3/10/2023 the project is still working, providing a low but consistent profit every month.

In order to run it one must create a wallet on the WAX blockchain and insert the private keys into the  `config.js` file.

I suggest to use different wallets for each of the possibile arbitrage/trading strategies in order to avoid conflicts when working on the same orderbook.

To run it, after having configured the settings in the configuration file, it sufficient to run `npm run [strategy]` where strategy can be choosen among:
  - buyswap
  - swapsell
  - buysell
** NOTE: These strategies only work when the spread between the orderbook and liquidity pools is greater/equal than the input spread in the `config.js` file.

# Buy Swap (Arbitrage)
Place orders at the best buying price in the orderbook, to swap it on the LP as soon as it gets filled.

# Swap Sell
Swap on the LP, to place sell orders on the orderbook. 

# Buy Sell 
Place buy orders, to sell orders once the buy one gets filled.

To run it, it is necessary to have `pm2` installed


