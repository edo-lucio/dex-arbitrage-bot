/* eslint-disable require-jsdoc */
const {
    Token,
    Pool,
    Percent,
    Trade,
    CurrencyAmount,
} = require("@alcorexchange/alcor-swap-sdk");

// Alcor v2 sdk: https://github.com/alcorexchange/alcor-v2-sdk
// import { Token, Pool, Trade, CurrencyAmount, Percent } from "../src";

const { RpcWrapper } = require("wax-bot-lib");
const { asset } = require("eos-common");

const consts = require("../../consts");
const config = require("../../config");

const rpc = new RpcWrapper(config.SERVER_ENDPOINT);

async function getAllRows(tableData) {
    let pairs = { more: true };
    let p = [];

    while (pairs.more) {
        pairs = await rpc.fetchTable(tableData);
        p = p.concat(pairs.rows);

        tableData.lower_bound = pairs.next_key;
    }

    return p;
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

async function main() {
    const rows = await getAllRows({
        code: consts.ALCORAMMSWAP_CONTRACT,
        scope: consts.ALCORAMMSWAP_CONTRACT,
        table: "pools",
        limit: 1000,
        lower_bound: 0,
    });
    const pools = [];

    // We have to get all pools with fetched ticks for them
    for (const p of rows) {
        console.log(p.tokenA, p.tokenB);
        const {
            id,
            tokenA,
            tokenB,
            currSlot: { sqrtPriceX64, tick },
        } = p;

        pools.push(
            new Pool({
                ...p,
                tokenA: parseToken(tokenA),
                tokenB: parseToken(tokenB),
                sqrtPriceX64,
                tickCurrent: tick,
            })
        );
    }

    // 1.0000 EOS
    const amountIn = CurrencyAmount.fromRawAmount(
        new Token("eosio.token", 8, "WAX"),
        1_0000
    );
    const tokenOut = new Token("alien.worlds", 4, "TLM");
    const slippage = new Percent(3, 100); // 0.3%
    const receiver = "myaccount";

    // First trade sorted by biggest output
    const [trade] = await Trade.bestTradeExactIn(pools, amountIn, tokenOut, {
        maxHops: 1,
    });

    const maxSent = trade.inputAmount;
    const minReceived = trade.minimumAmountOut(slippage);

    const result = {
        input: trade.inputAmount.toFixed(),
        output: trade.outputAmount.toFixed(),
        minReceived: minReceived.toFixed(),
        maxSent: maxSent.toFixed(),
        priceImpact: trade.priceImpact.toSignificant(2),
        executionPrice: {
            numerator: trade.executionPrice.numerator.toString(),
            denominator: trade.executionPrice.denominator.toString(),
        },
    };

    console.log(result);
}

main();
