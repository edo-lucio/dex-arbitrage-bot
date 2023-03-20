/* eslint-disable require-jsdoc */

const { Utils } = require("../utils");

const { TAPOS } = require("../../config");
const { MEMENTO_CREDENTIALS } = require("../../consts");

const mariadb = require("mariadb");

class TxData {
    static async getTxMemento(txId) {
        const query = `SELECT seq, trx_id, trace from TRANSACTIONS
            JOIN RECEIPTS USING (seq)
            WHERE 
            trx_id='${txId}'
            ORDER BY seq;
            `;

        const trace = await mariadb
            .createConnection(MEMENTO_CREDENTIALS)
            .then(async (conn) => {
                try {
                    const rows = await conn.query(query);
                    const json = JSON.parse(rows[0].trace);
                    return json;
                } catch (err) {
                    throw err;
                } finally {
                    if (conn) conn.end();
                }
            });

        return trace;
    }

    // prettier-ignore
    static async getOrder(txId, orderSide) {
        console.time(txId);
        console.log("Order status checking...");

        if (!txId) return;

        const start = Date.now();
        let end = Date.now();

        while (end - start < TAPOS.expireSeconds * 1200) {
            try {
                end = Date.now();
                console.log("...");

                // get the transaction data
                const tx = await this.getTxMemento(txId);
                const actions = tx.trace.action_traces;

                // filter the actions with parameters; will throw error if !tx
                const trace = actions.filter((action) => {
                    return action.act.account === "alcordexmain";
                });

                // access the order data
                const orderData = trace[0].act.data[`${orderSide}_order`];

                // assign generated id arguments
                const orderId = orderData.id;
                const orderAccount = orderData.account;
                const orderTimestamp = orderData.timestamp;

                // generate id to fetch
                orderData.generatedId = Utils.generateId(orderId, orderAccount, orderTimestamp);

                // buy/sell
                orderData.side = orderSide;
                orderData.bid = parseFloat(orderData.bid.replace(/[A-Za-z]+/g, ""));
                orderData.ask = parseFloat(orderData.ask.replace(/[A-Za-z]+/g, ""));

                console.log("Order updated", orderData.generatedId);
                return orderData;
            } catch (error) {
                continue;
            }
        }
        console.timeEnd(txId);
    }

    /* get cancel tx trace to check tx status */
    static async getCancel(txId) {
        if (!txId) return;

        const start = Date.now();
        let end = Date.now();

        while (end - start < TAPOS.expireSeconds * 1200) {
            try {
                end = Date.now();

                // gets the transaction data
                const tx = await this.getTxMemento(txId);
                const actions = tx.trace.action_traces;

                console.log("order canceled");
                return actions;
            } catch (error) {
                continue;
            }
        }
    }
}

module.exports = { TxData };
