"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const request_promise_1 = __importDefault(require("request-promise"));
const cheerio = __importStar(require("cheerio"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const luxon_1 = require("luxon");
const fieldNames = [
    'council_reference',
    'address',
    'description',
    'info_url',
    'date_scraped',
    'on_notice_from',
    'on_notice_to',
    'more_info',
];
const options = {
    uri: 'https://www.kingborough.tas.gov.au/development/planning-notices/',
    transform: (body) => cheerio.load(body),
};
sqlite3_1.default.verbose();
(0, request_promise_1.default)(options)
    .then(($) => {
    const data = [];
    $('#list tbody tr:not(:last-child)').map((i, el) => {
        const cells = $(el).find('td');
        const strings = cells
            .toArray()
            .map((el) => $(el).text().trim())
            .slice(0, 5);
        const more_info = $(el)
            .find('a')
            .toArray()
            .map((el) => $(el).attr('href'))
            .filter((s) => !!s);
        const info_url = more_info.shift() || '';
        const [council_reference, address, on_notice_from, on_notice_to, description,] = strings;
        data.push({
            council_reference,
            address,
            description,
            info_url,
            date_scraped: new Date().toISOString(),
            on_notice_from: luxon_1.DateTime.fromFormat(on_notice_from, 'd MMM yyyy').toISODate() || '',
            on_notice_to: luxon_1.DateTime.fromFormat(on_notice_to, 'd MMM yyyy').toISODate() || '',
            more_info: JSON.stringify(more_info),
        });
    });
    console.log(data);
    // Open a database handle
    var db = new sqlite3_1.default.Database('data.sqlite');
    const createFields = fieldNames
        .map((f, i) => {
        if (i === 0)
            return `${f} TEXT PRIMARY KEY`;
        return `${f} TEXT`;
    })
        .join(', ');
    const createQuery = `CREATE TABLE IF NOT EXISTS data (${createFields})`;
    const insertFields = fieldNames.join(', ');
    const insertQuery = `INSERT OR REPLACE INTO data (${insertFields}) VALUES (${fieldNames
        .map(() => '?')
        .join(', ')})`;
    db.serialize(function () {
        //Create new table
        console.log(`.then | createQuery:`, createQuery);
        db.run(createQuery);
        console.log(`insertQuery | insertQuery:`, insertQuery);
        // Insert a new record
        var statement = db.prepare(insertQuery);
        data.forEach((record) => {
            statement.run(record[fieldNames[0]], record[fieldNames[1]], record[fieldNames[2]], record[fieldNames[3]], record[fieldNames[4]], record[fieldNames[5]], record[fieldNames[6]], record[fieldNames[7]]);
        });
        statement.finalize();
    });
})
    .catch((err) => {
    console.log(err);
});
