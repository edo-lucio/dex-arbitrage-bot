/* eslint-disable require-jsdoc */

const { Wallet } = require("wax-bot-lib");
const { BuySwap, SwapSell, BuySell } = require("./trader/trader");

const config = require("../config");

const buySwapBooks = require("../books_config/buyswap.json");
const swapSellBooks = require("../books_config/swapsell.json");
const buySellBooks = require("../books_config/buysell.json");

const STRATEGY = process.argv[2];

if (!STRATEGY)
    throw new Error("Select a strategy between buysell, buyswap, swapsell");

function setWorker(worker) {
    const wallet = new Wallet(
        config.SERVER_ENDPOINT,
        worker.wallet,
        config.PAYER_WALLET
    );

    wallet.init();

    if (worker.strategy === "buyswap") {
        for (let i = 0; i < buySwapBooks.books.length; i++) {
            const trader = new BuySwap(wallet, buySwapBooks.books[i]);
            trader.init();
        }
    }

    if (worker.strategy === "swapsell") {
        for (let i = 0; i < swapSellBooks.books.length; i++) {
            const trader = new SwapSell(wallet, swapSellBooks.books[i]);
            trader.init();
        }
    }

    if (worker.strategy === "buysell") {
        for (let i = 0; i < buySellBooks.books.length; i++) {
            const trader = new BuySell(wallet, buySellBooks.books[i]);
            trader.init();
        }
    }
}

function main() {
    for (let i = 0; i < config.WORKERS.length; i++) {
        if (config.WORKERS[i].strategy === STRATEGY)
            setWorker(config.WORKERS[i]);
    }
}

main();
