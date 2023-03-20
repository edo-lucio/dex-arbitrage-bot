/* eslint-disable require-jsdoc */
const { RpcWrapper } = require("wax-bot-lib");

const axios = require("axios");
const config = require("../config");

const rpc = new RpcWrapper(config.SERVER_ENDPOINT);
const BANNED_CONTRACTS = config.BANNED_TOKENS_CONTRACTS;

function extractPoolInfo(pair, side) {
    const index = side === "base" ? 1 : 2;

    // prettier-ignore
    const symbol = String(pair[`pool${index}`].quantity).replace(/[^A-Za-z]+/g, "");
    const contract = pair[`pool${index}`].contract;
    const token = { symbol: symbol, contract: contract };

    return token;
}

class TokenPair {
    constructor(pair) {
        this.pair = pair;
    }

    async init() {
        await this.getMarketInfo();
        await this.getPoolID();
    }

    async getMarketInfo() {
        const URL = "https://alcor.exchange/api/markets";
        let markets = await axios.get(URL);
        markets = markets.data;

        for (let i = 0; i < markets.length; i++) {
            if (markets[i].quote_token.symbol.name != this.pair.quote_token)
                continue;

            if (markets[i].base_token.symbol.name != this.pair.base_token)
                continue;

            if (BANNED_CONTRACTS.includes(markets[i].quote_token.contract))
                continue;

            // base token data
            this.baseSymbol = markets[i].base_token.symbol.name;
            this.baseDecimals = markets[i].base_token.symbol.precision;
            this.baseContract = markets[i].base_token.contract;
            this.baseDiv = parseFloat(
                "1".padEnd(parseInt(this.baseDecimals) + 1, "0")
            );

            // quote token data
            this.quoteSymbol = markets[i].quote_token.symbol.name;
            this.quoteDecimals = markets[i].quote_token.symbol.precision;
            this.quoteContract = markets[i].quote_token.contract;
            this.quoteDiv = parseFloat(
                "1".padEnd(parseInt(this.quoteDecimals) + 1, "0")
            );

            this.marketId = markets[i].id;
            this.market = this.baseSymbol + "/" + this.quoteSymbol;
        }
    }

    async getPoolID() {
        const tableData = {
            code: "alcorammswap",
            scope: "alcorammswap",
            table: "pairs",
            limit: 1000,
            lower_bound: 0,
        };

        let pairs = { more: true };

        while (pairs.more) {
            console.log("Finding pool", this.pair);
            pairs = await rpc.fetchTable(tableData);

            for (const pair of pairs.rows) {
                const baseToken = extractPoolInfo(pair, "base");
                const quoteToken = extractPoolInfo(pair, "quote");

                if (BANNED_CONTRACTS.includes(baseToken.contract)) continue;
                if (BANNED_CONTRACTS.includes(quoteToken.contract)) continue;

                // prettier-ignore
                if (baseToken.symbol != this.pair.base_token &&
                    baseToken.symbol != this.pair.quote_token)   
                    continue;

                // prettier-ignore
                if (quoteToken.symbol != this.pair.base_token &&
                    quoteToken.symbol != this.pair.quote_token)
                    continue;

                this.poolId = pair.id;
                return;
            }

            tableData.lower_bound = pairs.next_key;
        }
    }
}

module.exports = { TokenPair };
async function getTokenPairTest() {
    const pair = { quote_token: "MARTIA", base_token: "WAX" };
    const token = new TokenPair(pair);
    await token.init();
    console.log(token);
}
