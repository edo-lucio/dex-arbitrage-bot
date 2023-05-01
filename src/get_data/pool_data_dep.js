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

        const poolA = String(rows[0].tokenA.quantity).replace(/[^A-Za-z]+/g, "");
        const poolB = String(rows[0].tokenB.quantity).replace(/[^A-Za-z]+/g, "");

        const qtyA = parseFloat(rows[0].tokenA.quantity.replace(/[A-Za-z]+/g, ""));
        const qtyB = parseFloat(rows[0].tokenB.quantity.replace(/[A-Za-z]+/g, ""));

        if (poolA === tokenPair.baseSymbol) {
            const price = qtyA / qtyB;
            const liquidity = { ["base"]: qtyA, ["quote"]: qtyB };
            const poolData = { price: price, liquidity: liquidity };

            return poolData
        }

        if (poolB === tokenPair.baseSymbol) {
            const price = qtyB / qtyA;
            const liquidity = { ["base"]: qtyB, ["quote"]: qtyA };
            const poolData = { price: price, liquidity: liquidity };

            return poolData
        }
    }

    static getPriceImpact(liquidity, bidQuantity, bidType) {
        let tokenALiquidity;
        let tokenBLiquidity;

        if (bidType === "base") {
            tokenALiquidity = liquidity.base;
            tokenBLiquidity = liquidity.quote;
        } else {
            tokenALiquidity = liquidity.quote;
            tokenBLiquidity = liquidity.base;
        }

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

        return priceImpact.toFixed(2);
    }
}

module.exports = { PoolData };

async function testGetPoolData() {
    // instantiate token pair
    const pair = { quote_token: "TLM", base_token: "WAX" };
    const tokenPair = new TokenPair(pair);
    await tokenPair.init();

    const poolData = await PoolData.getPoolData(tokenPair);
    console.log(poolData);
}

testGetPoolData();

async function testGetPriceImpact() {
    // instantiate token pair
    const pair = { quote_token: "TLM", base_token: "WAX" };
    const tokenPair = new TokenPair(pair);
    await tokenPair.init();

    const bid = 1000;
    const poolData = await PoolData.getPoolData(tokenPair);
    const priceImpact = PoolData.getPriceImpact(
        poolData.liquidity,
        bid,
        "base"
    );
    console.log(priceImpact);
}

// testGetPriceImpact();
