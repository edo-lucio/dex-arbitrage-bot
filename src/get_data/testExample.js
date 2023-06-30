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
const { JsonRpc } = require("eosjs");
const fetch = require("node-fetch");

const { asset } = require("eos-common");
const consts = require("../../consts");
const config = require("../../config");

const rpc = new JsonRpc(config.SERVER_ENDPOINT, { fetch });

async function fetchAllRows(tableData) {
    let pairs = { more: true };
    let p = [];

    while (pairs.more) {
        pairs = await rpc.get_table_rows(tableData);
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
    const rows = await fetchAllRows({
        scope: "swap.alcor",
        table: "pools",
        code: "swap.alcor",
    });

    const pools = [];

    // We have to get all pools with fetched ticks for them
    for (const p of rows) {
        const {
            id,
            tokenA,
            tokenB,
            currSlot: { sqrtPriceX64, tick },
        } = p;

        const ticks = await fetchAllRows({
            scope: id,
            table: "ticks",
            code: "swap.alcor",
        });

        pools.push(
            new Pool({
                ...p,
                tokenA: parseToken(tokenA),
                tokenB: parseToken(tokenB),
                sqrtPriceX64,
                tickCurrent: tick,
                ticks: ticks.sort((a, b) => a.id - b.id),
            })
        );
    }

    // 1.0000 EOS
    const amountIn = CurrencyAmount.fromRawAmount(
        new Token("eosio.token", 8, "WAX"),
        1000.0
    );

    const tokenOut = new Token("alien.worlds", 4, "TLM");
    const slippage = new Percent(3, 100); // 0.3%
    const receiver = "myaccount";

    console.log(pools);

    // First trade sorted by biggest output
    const [trade] = await Trade.bestTradeExactIn(pools, amountIn, tokenOut, {
        maxHops: 3,
    });

    console.log("Good News");

    const route = trade.swaps.pools.map((p) => p.id);

    const maxSent = trade.inputAmount;
    const minReceived = trade.minimumAmountOut(slippage);

    // Memo Format <Service Name>#<Pool ID's>#<Recipient>#<Output Token>#<Deadline>
    const memo = `swapexactin#${route.join(
        ","
    )}#${receiver}#${minReceived.toExtendedAsset()}#0`;

    const result = {
        input: trade.inputAmount.toFixed(),
        output: trade.outputAmount.toFixed(),
        minReceived: minReceived.toFixed(),
        maxSent: maxSent.toFixed(),
        priceImpact: trade.priceImpact.toSignificant(2),
        memo,
        route,
        executionPrice: {
            numerator: trade.executionPrice.numerator.toString(),
            denominator: trade.executionPrice.denominator.toString(),
        },
    };

    console.log(result);
}

main();

// {
//   input: '1.0000',
//   output: '1.0314 USDT',
//   minReceived: '1.0013',
//   maxSent: '1.0000',
//   priceImpact: '0.44',
//   memo: 'swapexactin#2#myaccount#1.0013 USDT@tethertether#0',
//   route: [ 2 ],
//   executionPrice: { numerator: '10314', denominator: '10000' }
// }
