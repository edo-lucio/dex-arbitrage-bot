/* eslint-disable require-jsdoc */

class Helpers {
    /* check if order is filled */
    static isFilled(lastOrderFetch, newOrderFetch) {
        const lastBid = lastOrderFetch.bid;
        const newBid = newOrderFetch.bid;

        const res = lastBid > newBid ? true : false;
        return res;
    }

    /* check if order is live */
    static isLive(order) {
        const res = typeof order === "undefined" ? false : true;
        return res;
    }

    /* check if bid is full */
    static isNotFullBid(order, fullBid) {
        const res = order.bid < fullBid * 0.8 ? true : false;
        return res;
    }

    /* check if price is not the best one */
    static isNotBestPrice(order, bestPrice) {
        if (order.side === "sell") {
            const res = order.unit_price > bestPrice ? true : false;
            return res;
        }

        if (order.side === "buy") {
            const res = order.unit_price < bestPrice ? true : false;
            return res;
        }
    }

    /* check if price is higher than 1 percent on the best price */
    static isNotOptimized(order, bestPrice) {
        if (order.side === "buy") {
            const res =
                order.unit_price > bestPrice + bestPrice * 0.01 ? true : false;

            return res;
        }

        if (order.side === "sell") {
            const res =
                order.unit_price < bestPrice - bestPrice * 0.01 ? true : false;

            return res;
        }
    }

    static needUpdate(order, bestPrice, bid) {
        const notBestPrice = this.isNotBestPrice(order, bestPrice);
        const notOptimized = this.isNotOptimized(order, bestPrice);
        const notFullBid = this.isNotFullBid(order, bid);

        if (notBestPrice || notOptimized || notFullBid) return true;
        return false;
    }
}

module.exports = { Helpers };
