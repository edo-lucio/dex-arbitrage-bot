/* eslint-disable require-jsdoc */
const { RpcWrapper } = require("wax-bot-lib");
const { Utils } = require("../utils");

const { MarketData } = require("../get_data/market_data");
const { PoolData } = require("../get_data/pool_data");
const { Tx } = require("./tx");
const { TokenPair } = require("../token_pair");

const config = require("../../config");
const rpc = new RpcWrapper(config.SERVER_ENDPOINT);

class Trader extends Tx {
    constructor(wallet, tradeData) {
        super(wallet);
        this.address = wallet.executorAddress;

        this.baseBid = tradeData.bid;
        this.quoteBid;
        this.spreadLimit = tradeData.spread;
        this.marketPair = tradeData.market;
        this.wait = tradeData.wait;

        this.order = {};
    }

    // prettier-ignore
    async checkSide(side) {
        const bidType = side === "buy" ? "base" : "quote";
        const bestPrice = await MarketData.getBestPrice(side, this.tokenPair, this.address);
        const poolData = await PoolData.getPoolData(this.tokenPair);
        const priceImpact = await PoolData.getPriceImpact(poolData.liquidity, this.tokenPair, this.baseBid, bidType);
        const spread = Math.abs(100 - (poolData.price / bestPrice) * 100) - priceImpact;
        const maxQuoteBid = this.baseBid / poolData.price;

        this.quoteBid = maxQuoteBid;
        this.order[side] = await MarketData.checkMyOrder(side, this.tokenPair, this.order[side]);

        return { 
            maxQuoteBid: maxQuoteBid,
            bestPrice: bestPrice,
            poolData: poolData,
            priceImpact: priceImpact,
            spread: spread,
        }
    }
}

class BuySwap extends Trader {
    constructor(wallet, tradeData) {
        super(wallet, tradeData);
    }

    async init() {
        this.tokenPair = new TokenPair(this.marketPair);
        await this.tokenPair.init();

        const orders = await MarketData.fetchOrderBook("buy", this.tokenPair);
        const myOrder = orders.filter(
            (order) => order.account === this.address
        );

        this.order["buy"] = myOrder[0];

        while (true) {
            await this.lookUp();
            await Utils.sleep(this.wait);
        }
    }

    // prettier-ignore
    async lookUp() {
        console.log("Fetching", this.tokenPair.market);

        // const quoteBalance = await rpc.getAssetBalance(this.tokenPair.quoteContract, this.address, this.tokenPair.quoteSymbol);
        // const bestBuy = await MarketData.getBestPrice("buy", this.tokenPair, this.address);
        // const poolData = await PoolData.getPoolData(this.tokenPair);
        // const priceImpact = await PoolData.getPriceImpact(poolData.liquidity, this.tokenPair, this.baseBid);
        // const spread = (100 - (bestBuy / poolData.price) * 100) - priceImpact;
        // const maxQuoteBalance = this.baseBid * bestBuy;

        // this.order = await MarketData.checkMyOrder("buy", this.tokenPair, this.order);
        const tradeData = await this.checkSide("buy");
        const quoteBalance = await rpc.getAssetBalance(this.tokenPair.quoteContract, this.address, this.tokenPair.quoteSymbol);
        const quotePercentage = (quoteBalance / tradeData.maxQuoteBid) * 100;

        if (quotePercentage >= config.QUOTE_LIMIT_PERCENTAGE) {
            await super.swapForBase(quoteBalance, tradeData.poolData.price, this.tokenPair);
        }

        if (tradeData.spread >= this.spreadLimit) {
            this.order["buy"] = await super.update(this.order["buy"], tradeData.bestPrice, this.baseBid, this.tokenPair, "buy");
            return
        }

        // if spread is closed delete order if open and wait
        if (this.order["buy"]) {
            await this.cancelOrder(this.order["buy"]);
        }
        console.log("Waiting for the spread");
    }
}

class SwapSell extends Trader {
    constructor(wallet, tradeData) {
        super(wallet, tradeData);
    }

    async init() {
        this.tokenPair = new TokenPair(this.marketPair);
        await this.tokenPair.init();

        const orders = await MarketData.fetchOrderBook("sell", this.tokenPair);
        const myOrder = orders.filter(
            (order) => order.account === this.address
        );

        this.order["sell"] = myOrder[0];

        while (true) {
            await this.lookUp();
            await Utils.sleep(this.wait);
        }
    }

    // prettier-ignore
    async lookUp() {
        console.log("Fetching", this.tokenPair.market);

        // const quoteBalance = await rpc.getAssetBalance(this.tokenPair.quoteContract, this.address, this.tokenPair.quoteSymbol);
        // const bestSell = await MarketData.getBestPrice("sell", this.tokenPair, this.address);
        // const poolData = await PoolData.getPoolData(this.tokenPair);
        // const priceImpact = await PoolData.getPriceImpact(poolData.liquidity, this.tokenPair, this.baseBid);
        // const spread = (100 - (poolData.price / bestSell) * 100) - priceImpact;
        // const maxQuoteBid = this.baseBid / poolData.price;
        // this.quoteBid = maxQuoteBid;

        // this.order = await MarketData.checkMyOrder("sell", this.tokenPair, this.order);

        const tradeData = await this.checkSide("sell");
        const quoteBalance = await rpc.getAssetBalance(this.tokenPair.quoteContract, this.address, this.tokenPair.quoteSymbol);
        const orderBid = this.order["sell"]?.bid ?? 0
        const totQuoteBalance = quoteBalance + orderBid;
        this.quoteBid = totQuoteBalance;

        // refill
        if (totQuoteBalance < tradeData.maxQuoteBid * 0.8) {
            const quoteShortage = tradeData.maxQuoteBid - totQuoteBalance;
            const baseShortage = quoteShortage * tradeData.poolData.price;
            const quoteRefill = await super.swapForQuote(baseShortage, tradeData.poolData.price, this.tokenPair);
            this.quoteBid = quoteRefill + totQuoteBalance;
        }
        
        if (tradeData.spread >= this.spreadLimit) {
            this.order["sell"] = await super.update(this.order["sell"], tradeData.bestPrice, this.quoteBid, this.tokenPair, "sell");
            return
        }
        console.log("Waiting for the spread", this.tokenPair.market);
    }
}

class BuySell extends Trader {
    constructor(wallet, tradeData) {
        super(wallet, tradeData);
    }

    // prettier-ignore
    async init() {
        this.tokenPair = new TokenPair(this.marketPair);
        await this.tokenPair.init();

        const buyOrders = await MarketData.fetchOrderBook("buy", this.tokenPair);
        const sellOrders = await MarketData.fetchOrderBook("sell", this.tokenPair);

        const myBuys = buyOrders.filter((order) => order.account === this.address);
        const mySells = sellOrders.filter((order) => order.account === this.address);

        this.order["buy"] = myBuys[0];
        this.order["sell"]  = mySells[0];

        while (true) {
            await this.lookUp();
            await Utils.sleep(this.wait);
        }
    }

    // prettier-ignore
    async lookUp() {
        console.log("Fetching", this.tokenPair.market);

        // market price data
        const bestBuy = await MarketData.getBestPrice("buy", this.tokenPair, this.address);
        const bestSell = await MarketData.getBestPrice("sell", this.tokenPair, this.address);
        const spread = 100 - (bestBuy / bestSell) * 100;

        // orders
        this.order["buy"] = await MarketData.checkMyOrder("buy", this.tokenPair, this.order["buy"]);
        this.order["sell"] = await MarketData.checkMyOrder("sell", this.tokenPair, this.order["sell"]);

        const sellBid = this.order["sell"]?.bid ?? 0
        const quoteBalance = await rpc.getAssetBalance(this.tokenPair.quoteContract, this.address, this.tokenPair.quoteSymbol);
        const totQuoteBalance = quoteBalance + sellBid;
        const maxQuoteBid = this.baseBid / bestBuy;
        this.quoteBid = maxQuoteBid;

        if (totQuoteBalance > maxQuoteBid * 1.5) {
            throw Error("Quote balance is more than expected")
        }

        if (totQuoteBalance < maxQuoteBid) {
            this.quoteBid = totQuoteBalance;
        }

        // spread check before order updating...
        if (spread >= this.spreadLimit) {
            this.order["sell"] = await super.update(this.order["sell"], bestSell, this.quoteBid, this.tokenPair, "sell");
            this.order["buy"] = await super.update(this.order["buy"], bestBuy, this.baseBid, this.tokenPair, "buy"); 
            return
        }

        // delete live buy orders if spread is closed
        if (this.order["buy"]) {
            await this.cancelOrder(this.order["buy"]); // delete buy order
            console.log("Waiting for the spread");
        }
    }
}

module.exports = { BuySwap, SwapSell, BuySell };
