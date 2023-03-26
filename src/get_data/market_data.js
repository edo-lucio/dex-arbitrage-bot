/* eslint-disable require-jsdoc */
const { RpcWrapper } = require("wax-bot-lib");
const { Helpers } = require("./helpers");
const { TokenPair } = require("../token_pair");

const config = require("../../config");
const consts = require("../../consts");

const rpc = new RpcWrapper(config.SERVER_ENDPOINT);

class MarketData {
    static async fetchOrderBook(side, tokenPair) {
        const { rows } = await rpc.fetchTable({
            code: consts.ALCOR_CONTRACT,
            scope: tokenPair.marketId,
            table: `${side}order`,
            index_position: 2,
            key_type: consts.SORTED_ORDER_KEY,
            limit: 1000,
        });

        const orderBook = Helpers.makeOrderBook(rows, tokenPair, side);
        return orderBook;
    }

    static async getBestPrice(side, tokenPair, myAddress) {
        const offer = side == "buy" ? "bid" : "ask";
        const orders = await this.fetchOrderBook(side, tokenPair);

        let priceLevelBidSum = 0;

        for (let i = 0; i < orders.length; i++) {
            if (orders[i].account === myAddress) continue;

            priceLevelBidSum += orders[i][offer];

            // return best price if price level bid sum is over the threshold
            if (priceLevelBidSum > config.BID_UPDATE_THRESHOLD) {
                const priceChange = Helpers.priceIncrement(
                    tokenPair.baseDecimals
                );

                const bestPrice =
                    side === "buy"
                        ? orders[i].unit_price + priceChange
                        : orders[i].unit_price - priceChange;

                return bestPrice.toFixed(tokenPair.baseDecimals);
            }
        }
    }

    static async checkMyOrder(side, tokenPair, orderToCheck) {
        if (!orderToCheck) return;

        // prettier-ignore
        for (let i = 0; i < 10; i++) {
            try {
                const orderId = orderToCheck.generatedId;
                const orders = await this.fetchOrderBook(side, tokenPair);
                const myOrder = orders.filter((order) => order.generatedId === orderId);
                console.log("found order, id:", myOrder[0].generatedId);

                return myOrder[0];
            } catch (error) {
                continue;
            }
        }
    }
}

async function testFetchOrderbook() {
    // instantiate token pair
    const pair = { quote_token: "MARTIA", base_token: "WAX" };
    const tokenPair = new TokenPair(pair);
    await tokenPair.init();

    const orders = await MarketData.fetchOrderBook("buy", tokenPair);
    console.log(orders[0]);
}

async function testGetBestPrice() {
    // instantiate token pair
    const pair = { quote_token: "MARTIA", base_token: "WAX" };
    const tokenPair = new TokenPair(pair);
    await tokenPair.init();
    const address = "marcantonio4";

    const bestPrice = await MarketData.getBestPrice("sell", tokenPair, address);
    console.log(bestPrice);
}

async function testCheckMyOrder() {
    // instantiate token pair
    const pair = { quote_token: "SEST", base_token: "WAX" };
    const tokenPair = new TokenPair(pair);
    await tokenPair.init();

    const address = "badpollastro";
    const orders = await MarketData.fetchOrderBook("sell", tokenPair);
    const myOrders = orders.filter((order) => order.account === address);

    const myOrder = await MarketData.checkMyOrder(
        "sell",
        tokenPair,
        myOrders[0]
    );

    console.log(myOrder);
}

// testCheckMyOrder();

module.exports = { MarketData };
