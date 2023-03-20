/* eslint-disable require-jsdoc */
const { RpcWrapper } = require("wax-bot-lib");
const { TokenPair } = require("../token_pair");

const consts = require("../../consts");
const config = require("../../config");

const rpc = new RpcWrapper(config.SERVER_ENDPOINT);
const table = consts.ALCORAMMSWAP_TABLE;

class PoolData {
    // prettier-ignore
    static async getPoolData(tokenPair) {

        table.lower_bound = tokenPair.poolId;
        table.upper_bound = tokenPair.poolId;

        const { rows } = await rpc.fetchTable(table);

        const poolA = String(rows[0].pool1.quantity).replace(/[^A-Za-z]+/g, "");
        const poolB = String(rows[0].pool2.quantity).replace(/[^A-Za-z]+/g, "");

        const qtyA = parseFloat(rows[0].pool1.quantity.replace(/[A-Za-z]+/g, ""));
        const qtyB = parseFloat(rows[0].pool2.quantity.replace(/[A-Za-z]+/g, ""));

        if (poolA === tokenPair.baseSymbol) {
            const price = qtyA / qtyB;
            const liquidity = { [tokenPair.baseSymbol]: qtyA, [tokenPair.quoteSymbol]: qtyB };
            const poolData = { price: price, liquidity: liquidity };

            return poolData
        }

        if (poolB === tokenPair.baseSymbol) {
            const price = qtyB / qtyA;
            const liquidity = { [tokenPair.baseSymbol]: qtyB, [tokenPair.quoteSymbol]: qtyA };
            const poolData = { price: price, liquidity: liquidity };

            return poolData
        }
    }

    static async getPriceImpact(liquidity, tokenPair, bidQuantity) {
        const tokenALiquidity = liquidity[tokenPair.baseSymbol];
        const tokenBLiquidity = liquidity[tokenPair.quoteSymbol];

        // calculate the market price
        const marketPrice = tokenALiquidity / tokenBLiquidity;

        // calculate the constant value
        const k = tokenALiquidity * tokenBLiquidity;

        // add the quantity to swap (in base token) to the token's liquidity
        const newTokenALiquidity = tokenALiquidity + parseFloat(bidQuantity);

        // use the constant value and the new base token liquidity to calculate the new quote token liquidity
        const newTokenBLiquidity = k / newTokenALiquidity;

        // calculate the quote token's amount out
        const tokenBOut = tokenBLiquidity - newTokenBLiquidity;

        // calculate the new price
        const newPrice = bidQuantity / tokenBOut;

        // calculate the price impact
        let priceImpact = 100 - (marketPrice / newPrice) * 100;
        priceImpact += consts.FEES;

        return priceImpact;
    }
}

module.exports = { PoolData };

async function testGetPoolData() {
    // instantiate token pair
    const pair = { quote_token: "SEST", base_token: "WAX" };
    const tokenPair = new TokenPair(pair);
    await tokenPair.init();

    const poolData = await PoolData.getPoolData(tokenPair);
    console.log(poolData);
}

// testGetPoolData();

async function testGetPriceImpact() {
    // instantiate token pair
    const pair = { quote_token: "SEST", base_token: "WAX" };
    const tokenPair = new TokenPair(pair);
    await tokenPair.init();

    const bid = 88;
    const poolData = await PoolData.getPoolData(tokenPair);
    const priceImpact = await PoolData.getPriceImpact(
        poolData.liquidity,
        tokenPair,
        bid
    );
    console.log(priceImpact);
}

// testGetPriceImpact();
