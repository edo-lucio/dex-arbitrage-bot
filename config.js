const dotenv = require("dotenv");

dotenv.config();

module.exports = Object.freeze({
    WORKERS: [
        {
            strategy: "buyswap",
            wallet: {
                address: process.env.COSIGNER_ADDRESS,
                private_key: process.env.COSIGNER_PRIVATE_KEY,
            },
        },
        {
            strategy: "swapsell",
            wallet: {
                address: process.env.WORKER1_ADDRESS,
                private_key: process.env.WORKER1_PRIVATE_KEY,
            },
        },

        {
            strategy: "buysell",
            wallet: {
                address: process.env.WORKER2_ADDRESS,
                private_key: process.env.WORKER2_PRIVATE_KEY,
            },
        },
    ],

    PAYER_WALLET: {
        address: process.env.COSIGNER_ADDRESS,
        private_key: process.env.COSIGNER_PRIVATE_KEY,
    },

    MAX_TX_FEE: 0,

    BID_UPDATE_THRESHOLD: 1, // in wax; minimum bid size that triggers an update if an order with such size is placed at a better price

    PRICE_INCREMENT: 1,

    SERVER_ENDPOINT: "http://eu.wax.eosrio.io",

    BANNED_TOKENS_CONTRACTS: [
        "underwtokens",
        "metaversedmt",
        "shmothership",
        "unboundtoken",
        "gems.tycoon",
        "goldenfarmtk",
        "vladwaves123",
        "modernworldt",
    ],

    TAPOS: {
        blocksBehind: 3,
        expireSeconds: 40,
    },

    QUOTE_LIMIT_PERCENTAGE: 1,
});
