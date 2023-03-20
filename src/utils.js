/* eslint-disable require-jsdoc */
const crypto = require("crypto");

class Utils {
    static async sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    static generateId(...data) {
        let id = "";
        for (let i = 0; i < data.length; i++) {
            id += String(data[i]);
        }

        return crypto
            .createHash("sha1")
            .update(JSON.stringify(id))
            .digest("hex");
    }

    static fix(numberToFix, decimals) {
        let number = (
            Math.trunc(numberToFix * Math.pow(10, decimals)) /
            Math.pow(10, decimals)
        ).toString();

        if (number.includes(".") == true) {
            number = number.split(".");
            return number[0] + "." + number[1].padEnd(decimals, "0");
        }

        if (decimals > 0) {
            return number + ".".padEnd(decimals + 1, "0");
        }

        return number;
    }

    static shuffle(a) {
        let j;
        let x;
        let i;

        for (i = a.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            x = a[i];
            a[i] = a[j];
            a[j] = x;
        }
        return a;
    }
}

module.exports = { Utils };
