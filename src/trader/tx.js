/* eslint-disable no-unused-vars */
/* eslint-disable require-jsdoc */
const { Sender, Wallet } = require("wax-bot-lib");

const { Helpers } = require("./helpers");
const { MarketData } = require("../get_data/market_data");
const { PoolData } = require("../get_data/pool_data");
const { TxData } = require("../get_data/tx_data");

const { Utils } = require("../utils");

const config = require("../../config");
const consts = require("../../consts");

/* order tx */
class Tx {
    constructor(wallet) {
        this.wallet = wallet;
        this.sender = new Sender(wallet, config.MAX_TX_FEE);
    }

    // prettier-ignore
    async buy(bid, price, tokenPair) {
        const quoteAmountOut = Utils.fix(bid / price, tokenPair.quoteDecimals);
        bid = Utils.fix(quoteAmountOut * price, tokenPair.baseDecimals);

        // if bid is below minimum return
        if (parseFloat(bid) <= parseFloat(tokenPair.minbuy)) {
            return;
        }

        // if amount out is below minimum return
        if (parseFloat(quoteAmountOut) <= parseFloat(tokenPair.minsell)) {
            return;
        }

        console.log("Making order at", price, "on", tokenPair.market);

        const action = {
            account: tokenPair.baseContract,
            name: "transfer",
            authorization: [
                {
                    actor: this.wallet.coSignAddress,
                    permission: "active",
                },
                {
                    actor: this.wallet.executorAddress,
                    permission: "active",
                },
            ],
            data: {
                from: this.wallet.executorAddress,
                to: "alcordexmain",
                quantity: `${bid} ${tokenPair.baseSymbol}`,
                memo: `${quoteAmountOut} ${tokenPair.quoteSymbol}@${tokenPair.quoteContract}`,
            },
        };

        for (let i = 0; i < 10; i++) {
            const [response, error] = await this.sender.sendTx([action], config.TAPOS);
            if (error) continue;

            const order = await TxData.getOrder(
                response.transaction_id,
                "buy"
            );

            return order;
        }
    }

    // prettier-ignore
    async sell(quoteBid, price, tokenPair) {
        const baseTokenAmountOut = Utils.fix(quoteBid * price, tokenPair.baseDecimals);
        quoteBid = quoteBid.toFixed(tokenPair.quoteDecimals)

        // if bid is below minimum return
        if (parseFloat(quoteBid) <= parseFloat(this.tokenPair.minsell)) {
            return;
        }

        // if bid is below minimum return
        if (parseFloat(baseTokenAmountOut) <= parseFloat(this.tokenPair.minbuy)) {
            return;
        }

        console.log("Making order at", price, "on", this.tokenPair.market);

        const action = {
            account: tokenPair.quoteContract,
            name: "transfer",
            authorization: [
                {
                    actor: this.wallet.coSignAddress,
                    permission: "active",
                },
                {
                    actor: this.wallet.executorAddress,
                    permission: "active",
                },
            ],
            data: {
                from: this.wallet.executorAddress,
                memo: `${baseTokenAmountOut} ${tokenPair.baseSymbol}@${tokenPair.baseContract}`,
                quantity: `${quoteBid} ${tokenPair.quoteSymbol}`,
                to: `alcordexmain`,
            },
        };

        console.log(action);

        for (let i = 0; i < 10; i++) {
            // send transaction
            const [response, error] = await this.sender.sendTx(
                [action],
                config.TAPOS
            );

            // retry if error
            if (error) continue;

            // get the order
            const order = await TxData.getOrder(
                response.transaction_id,
                "sell"
            );

            return order;
        }
    }

    // prettier-ignore
    async cancelOrder(order) {
        const action = {
            account: "alcordexmain",
            name: `cancel${order.side}`,
            authorization: [
                {
                    actor: this.wallet.coSignAddress,
                    permission: "active",
                },
                {
                    actor: this.wallet.executorAddress,
                    permission: "active",
                },
            ],
            data: {
                executor: order.account,
                market_id: order.pair.marketId,
                order_id: order.id,
            },
        };

        // send transaction
        const [response, error] = await this.sender.sendTx([action], config.TAPOS);

        if (response) {
            const txId = response.transaction_id;
            const trace = await TxData.getCancel(txId);
            if (trace) return [response, undefined];
            return [undefined, "error"];
        }
        return [undefined, error];
    }

    /* swap quote token for base: note that the subtracted baseTAmountOut quantity serves as a lower bound to which you allow to have in return 
    if it's higher you get the full quanity */
    // prettier-ignore
    async swapForBase(quoteQty, poolPrice, tokenPair) {
        const priceImpact = await PoolData.getPriceImpact(tokenPair.quote, tokenPair.base, quoteQty);
        
        let baseAmountOut = quoteQty * poolPrice;
        baseAmountOut = baseAmountOut - baseAmountOut * (priceImpact / 100);
        baseAmountOut = Utils.fix(baseAmountOut, tokenPair.baseDecimals);

        quoteQty = Utils.fix(quoteQty, tokenPair.quoteDecimals);

        console.log(
            "swapping",
            quoteQty,
            tokenPair.quoteSymbol,
            "returns",
            baseAmountOut,
            tokenPair.baseSymbol
        );

        const action = {
            account: tokenPair.quoteContract,
            name: `transfer`,
            authorization: [
                {
                    actor: this.wallet.coSignAddress,
                    permission: "active",
                },
                {
                    actor: this.wallet.executorAddress,
                    permission: "active",
                },
            ],
            data: {
                from: this.wallet.executorAddress,
                memo: `swapexactin#${tokenPair.poolId}#${this.wallet.executorAddress}#${baseAmountOut} ${tokenPair.baseSymbol}@${tokenPair.baseContract}#0`,
                quantity: `${quoteQty} ${tokenPair.quoteSymbol}`,
                to: consts.ALCORAMMSWAP_CONTRACT,
            },
        };

        // prettier-ignore
        const [response, error] = await this.sender.sendTx([action], config.TAPOS);
        if (response) return;

        if (error.includes("Received lower")) {
            baseAmountOut = error.replace(/\D/g,'');
            baseAmountOut = (baseAmountOut / tokenPair.baseDiv).toFixed(tokenPair.baseDecimals);
            const newMemo = `swapexactin#${tokenPair.poolId}#${this.wallet.executorAddress}#${baseAmountOut} ${tokenPair.baseSymbol}@${tokenPair.baseContract}#0`
            action.data.memo = newMemo;

            const [response, err] = await this.sender.sendTx([action], config.TAPOS);
            if (response) return;
        }

        console.log("swap error", error, tokenPair.quote);
    }

    // prettier-ignore
    async swapForQuote(baseQty, poolPrice, tokenPair) {
        const priceImpact = await PoolData.getPriceImpact(tokenPair.base, tokenPair.quote, baseQty);
        let quoteAmountOut = baseQty / poolPrice;
        quoteAmountOut = quoteAmountOut - quoteAmountOut * (priceImpact / 100);
        quoteAmountOut = Utils.fix(quoteAmountOut, tokenPair.quoteDecimals);

        baseQty = Utils.fix(baseQty, tokenPair.baseDecimals);

        console.log(
            "swapping",
            baseQty,
            tokenPair.baseSymbol,
            "returns",
            quoteAmountOut,
            tokenPair.quoteSymbol
        );

        const action = {
            account: tokenPair.baseContract,
            name: `transfer`,
            authorization: [
                {
                    actor: this.wallet.coSignAddress,
                    permission: "active",
                },
                {
                    actor: this.wallet.executorAddress,
                    permission: "active",
                },
            ],
            data: {
                from: this.wallet.executorAddress,
                memo: `swapexactin#${tokenPair.poolId}#${this.wallet.executorAddress}#${quoteAmountOut} ${tokenPair.quoteSymbol}@${tokenPair.quoteContract}#0`,
                quantity: `${baseQty} ${tokenPair.baseSymbol}`,
                to: consts.ALCORAMMSWAP_CONTRACT,
            },
        };

        console.log(action)

        const [response, error] = await this.sender.sendTx([action], config.TAPOS);

        if (response) return parseFloat(quoteAmountOut);

        if (error.includes("Received lower")) {
            quoteAmountOut = error.replace(/\D/g,'');
            quoteAmountOut = (quoteAmountOut / tokenPair.quoteDiv).toFixed(tokenPair.quoteDecimals);
            const newMemo = `swapexactin#${tokenPair.poolId}#${this.wallet.executorAddress}#${quoteAmountOut} ${tokenPair.quoteSymbol}@${tokenPair.quoteContract}#0`
            action.data.memo = newMemo;
            
            const [response, err] = await this.sender.sendTx([action], config.TAPOS);
            if (response) return;
        }

        console.log("swap error", error);
    }

    // update an order by deleting the old one and placing another one at a given price
    async updateOrder(order, price, bid, pair) {
        const [success, error] = await this.cancelOrder(order);
        if (error) {
            console.log(error);
            return order; // this prevents from making another order if for some reason it couldn't find order
        }

        if (order.side == "buy") {
            const order = await this.buy(bid, price, pair);
            return order;
        }

        if (order.side == "sell") {
            const order = await this.sell(bid, price, pair);
            console.log(order);
            return order;
        }
    }

    // prettier-ignore
    async update(order, price, bid, pair, side) {
            const isLive = Helpers.isLive(order);

            if(side === "buy" && bid <= pair.minBuy) return;
            if(side === "sell" && bid <= pair.minSell) return;

            if (isLive) {
                const needPriceUpdate = Helpers.needUpdate(order, price, bid);
                if (needPriceUpdate) {
                    const newOrder = await this.updateOrder(order, price, bid, pair);
                    return newOrder;
                }

                console.log("No updates")
                return order;
            }
    
            if(!isLive) {
                console.log("not live");
                // if no buy order is live, make a buy order
                if (side === "buy") {
                    const newOrder = await this.buy(bid, price, pair);
                    return newOrder;
                }
    
                // if no sell order is live, make a sell order
                if (side === "sell") {
                    const newOrder = await this.sell(bid, price, pair);
                    return newOrder;
                }
            }
        }
}

module.exports = { Tx };

async function testBuy() {
    const wallet = new Wallet(
        config.SERVER_ENDPOINT,
        config.WORKERS[0], // buyswap worker
        config.PAYER_WALLET
    );
}
