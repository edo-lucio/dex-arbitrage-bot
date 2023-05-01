/* eslint-disable require-jsdoc */
const { RpcWrapper } = require("wax-bot-lib");

const axios = require("axios");
const config = require("../config");
const consts = require("../consts");

const rpc = new RpcWrapper(config.SERVER_ENDPOINT);
const BANNED_CONTRACTS = config.BANNED_TOKENS_CONTRACTS;

function extractPoolInfo(pair, side) {
    const index = side === "base" ? "B" : "A";

    // prettier-ignore
    const symbol = String(pair[`token${index}`].quantity).replace(/[^A-Za-z]+/g, "");
    const contract = pair[`token${index}`].contract;
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

            this.minBuy = markets[i].min_buy;
            this.minSell = markets[i].min_sell;

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

            this.base = {
                symbol: this.baseSymbol,
                contract: this.baseContract,
            };

            this.quote = {
                symbol: this.quoteSymbol,
                contract: this.quoteContract,
            };
        }
    }

    async getPoolID() {
        const tableData = {
            code: consts.ALCORAMMSWAP_CONTRACT,
            scope: consts.ALCORAMMSWAP_CONTRACT,
            table: "pools",
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

// getTokenPairTest();
