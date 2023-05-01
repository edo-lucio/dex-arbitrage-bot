/* eslint-disable require-jsdoc */
const fetch = require("node-fetch");
const util = require("util");

const {
    Token,
    Pool,
    Trade,
    CurrencyAmount,
    Percent,
} = require("@alcorexchange/alcor-swap-sdk");

const { JsonRpc } = require("eosjs");

const { asset } = require("eos-common");

const consts = require("../../consts");
const rpc = new JsonRpc("https://waxnode02.alcor.exchange", { fetch });

function getQuoteToken(tokenA, tokenB, tokenPair) {
    if (tokenA.symbol === tokenPair.quoteSymbol) {
        return tokenA;
    } else {
        return tokenB;
    }
}

function parseToken(token) {
    return new Token(
        token.contract,
        asset(token.quantity).symbol.precision(),
        asset(token.quantity).symbol.code().to_string(),
        (
            asset(token.quantity).symbol.code().to_string() +
            "-" +
            token.contract
        ).toLowerCase()
    );
}

async function getAllPools() {
    const tableData = {
        code: consts.ALCORAMMSWAP_CONTRACT,
        scope: consts.ALCORAMMSWAP_CONTRACT,
        table: "pools",
        limit: 1000,
        lower_bound: 0,
    };

    let pairs = { more: true };
    let p = [];

    while (pairs.more) {
        pairs = await rpc.get_table_rows(tableData);
        p = p.concat(pairs.rows);

        tableData.lower_bound = pairs.next_key;
    }

    return p;
}

class PoolData {
    static async getPrices(tokenPair) {
        const pools = await getAllPools();

        // prettier-ignore
        for (const [i, p] of pools.entries()) {
            const tokenA = parseToken(p.tokenA)
            const tokenB = parseToken(p.tokenB)
            const { sqrtPriceX64, tick } = p.currSlot

            if (tokenA.symbol != tokenPair.baseSymbol && tokenB.symbol != tokenPair.baseSymbol)
                continue;

            if (tokenA.symbol != tokenPair.quoteSymbol && tokenB.symbol != tokenPair.quoteSymbol)
                continue;

            const pool = new Pool({
                ...pools[i],
                tokenA: tokenA,
                tokenB: tokenB,
                sqrtPriceX64,
                tickCurrent: tick,
            });
            
            const quoteToken = getQuoteToken(tokenA, tokenB, tokenPair);
            return pool.priceOf(quoteToken).toFixed(8);
        }
    }

    static async getPriceImpact(tokenA, tokenB, quantity) {
        const url = util.format(
            consts.ALCOR_ENDPOINT,
            tokenA.symbol.toLowerCase(),
            tokenA.contract.toLowerCase(),
            tokenB.symbol.toLowerCase(),
            tokenB.contract.toLowerCase(),
            quantity
        );

        const response = await fetch(url);
        const data = await response.json();
        return parseFloat(data.priceImpact) + consts.FEES;
    }
}

module.exports = { PoolData };

// (async () => {
//     const tokenA = { symbol: "WAX", contract: "eosio.token" };
//     const tokenB = { symbol: "TLM", contract: "alien.worlds" };
//     const quantity = Number.parseFloat(40000).toFixed(8);
//     const tokenPair = { base: "WAX", quote: "BTK" };

//     console.log("---------------------");

//     const priceImpact = await PoolData.getPriceImpact(tokenA, tokenB, quantity);
//     // console.log(priceImpact);

//     const price = await PoolData.getPrices(tokenPair);
//     console.log(price);
// })();
