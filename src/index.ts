import request from 'request-promise';
import * as cheerio from 'cheerio';
import { CheerioAPI } from 'cheerio';
import sqlite3 from 'sqlite3';
import { DateTime } from 'luxon';

type FieldNames =
  | 'council_reference'
  | 'address'
  | 'description'
  | 'info_url'
  | 'date_scraped'
  | 'on_notice_from'
  | 'on_notice_to'
  | 'more_info';

type Document = Record<FieldNames, string>;

const fieldNames: readonly FieldNames[] = [
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
  transform: (body: string) => cheerio.load(body),
};

sqlite3.verbose();

request(options)
  .then(($: CheerioAPI) => {
    const data: Document[] = [];
    $('#list tbody tr').map((i, el) => {
      const cells = $(el).find('td');
      const strings = cells
        .toArray()
        .map((el) => $(el).text().trim())
        .slice(0, 5);
      const more_info = $(el)
        .find('a')
        .toArray()
        .map((el) => $(el).attr('href'))
        .filter((s): s is string => !!s);
      const info_url = more_info.shift() || '';
      const [
        council_reference,
        address,
        on_notice_from,
        on_notice_to,
        description,
      ] = strings;
      data.push({
        council_reference,
        address,
        description,
        info_url,
        date_scraped: new Date().toISOString(),
        on_notice_from:
          DateTime.fromFormat(on_notice_from, 'd MMM yyyy').toISODate() || '',
        on_notice_to:
          DateTime.fromFormat(on_notice_to, 'd MMM yyyy').toISODate() || '',
        more_info: JSON.stringify(more_info),
      });
    });
    console.log(data);
    // Open a database handle
    var db = new sqlite3.Database('data.sqlite');
    const createFields = fieldNames
      .map((f, i) => {
        if (i === 0) return `${f} TEXT PRIMARY KEY`;
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
        statement.run(
          record[fieldNames[0]],
          record[fieldNames[1]],
          record[fieldNames[2]],
          record[fieldNames[3]],
          record[fieldNames[4]],
          record[fieldNames[5]],
          record[fieldNames[6]],
          record[fieldNames[7]]
        );
      });
      statement.finalize();
    });
  })
  .catch((err: any) => {
    console.log(err);
  });
