/* eslint-disable require-jsdoc */
const { Utils } = require("../utils");
const config = require("../../config");

class Helpers {
    static makeOrderBook(orders, pair, side) {
        const orderBook = [];

        for (let i = 0; i < orders.length; i++) {
            orders[i].generatedId = Utils.generateId(
                orders[i].id,
                orders[i].account,
                orders[i].timestamp
            );

            orders[i].side = side;
            orders[i].bid = parseFloat(orders[i].bid.replace(/[A-Za-z]+/g, ""));
            orders[i].ask = parseFloat(orders[i].ask.replace(/[A-Za-z]+/g, ""));
            orders[i].unit_price = orders[i].unit_price / pair.baseDiv;
            orders[i].pair = pair;

            orderBook.push(orders[i]);
        }

        return orderBook;
    }

    static priceIncrement(decimals) {
        return parseFloat(
            "0.".padEnd(parseInt(decimals) + 1, "0") +
                config.PRICE_INCREMENT.toString()
        );
    }
}

module.exports = { Helpers };
