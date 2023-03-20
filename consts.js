module.exports = Object.freeze({
    TAPOS: {
        blocksBehind: 3,
        expireSeconds: 40,
    },

    ALCOR_CONTRACT: "alcordexmain",

    // endpoints to grab transactions from
    HYPERION_ENDPOINTS: [
        "https://api.wax.greeneosio.com/v2",
        "https://api.wax.alohaeos.com/v2",
        "https://wax.blokcrafters.io/v2",
        "https://wax.cryptolions.io/v2",
        "https://wax.dapplica.io/v2",
        "https://wax.eu.eosamsterdam.net/v2",
        "https://hyperion-wax-mainnet.wecan.dev/v2",
        "https://api.waxeastern.cn/v2",
        "https://hyperion-wax-mainnet.wecan.dev/v2",
        "https://wax.defibox.xyz/v2",
        "https://api.waxeastern.cn/v2",
        "https://api.wax.liquidstudios.io/v2",
        "https://wax.eu.eosamsterdam.net/v2",
        "https://hyperion-wax-mainnet.wecan.dev/v2",
        "https://wax.defibox.xyz/v2",
        "https://api.wax.liquidstudios.io/v2",
        "https://api.waxeastern.cn/v2",
        "https://wax.defibox.xyz/v2",
        "https://wax.dapplica.io/v2",
        "https://waxapi.ledgerwise.io/v2",
    ],

    // alcorammswap contract to send tokens to
    ALCORAMMSWAP_CONTRACT: "alcorammswap",

    // table data for fetching alcorammswap
    ALCORAMMSWAP_TABLE: {
        code: "alcorammswap",
        scope: "alcorammswap",
        table: "pairs",
        lower_bound: 0, // changes
        upper_bound: 0, // changes
    },

    // swap fees
    FEES: 0.4,

    // key to get orders from orderbook in descending order by price
    SORTED_ORDER_KEY: "i128",

    // sides
    side: { sell: "sell", buy: "buy" },

    // token's contract of dead token with identical symbol to others
    BANNED_TOKENS_CONTRACTS: [
        "underwtokens",
        "metaversedmt",
        "shmothership",
        "unboundtoken",
        "gems.tycoon",
    ],

    // credential to connect to mariadb
    MEMENTO_CREDENTIALS: {
        host: "memento.eu.eosamsterdam.net",
        user: "memento_ro",
        password: "memento_ro",
        database: "memento_wax",
        port: 3350,
    },

    // time in which a transaction can be confirmed (milliseconds)
    // must be greater than expireSeconds in TAPOS
    EXPIRE_TIME: 44008,
});
