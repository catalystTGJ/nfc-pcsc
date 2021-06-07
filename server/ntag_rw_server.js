"use strict";

// #############
// Example: Reading and writing data
// - should work well with any compatible PC/SC card reader
// - tested with MIFARE Ultralight cards but should work with many others (e.g. NTAG)
// - what is covered:
//   - example reading and writing data on from/to card
// - NOTE! for reading and writing data from/to MIFARE Classic please see examples/mifare-classic.js which explains MIFARE Classic specifics
// #############

import { NFC, TAG_ISO_14443_3, TAG_ISO_14443_4, KEY_TYPE_A, KEY_TYPE_B } from '../src/index';
import pretty from './pretty-logger';

const url_prefix_list = [
	"N/A",
	"http://www.",
	"https://www.",
	"http://",
	"https://",
	"tel:",
	"mailto:",
	"ftp://anonymouse:anonymous@",
	"ftp://ftp.",
	"ftps://",
	"sftp://",
	"smb://",
	"nfs://",
	"ftp://",
	"dav://",
	"news:",
	"telnet://",
	"imap:",
	"rtsp://",
	"urn:",
	"pop:",
	"sip:",
	"sips:",
	"tftp:",
	"btspp://",
	"btl2cap://",
	"btgoep://",
	"tcpobex://",
	"irdaobex://",
	"file://",
	"urn:epc:id:",
	"urn:epc:tag:",
	"urn:epc:pat:",
	"urn:epc:raw:",
	"urn:epc:",
	"urn:nfc:",
];

//the expected ATR byte array for the NTAG213's & NTAG215's that i'm working with:
const ntag_atr = [0x3b, 0x8f, 0x80, 0x01, 0x80, 0x4f, 0x0c, 0xa0, 0x00, 0x00, 0x03, 0x06, 0x03, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x68]

//the expected URL for a tag without a UID attached:
const expected_url_blank_tag = "70.124.172.205:8200/ntag_check/?ti=00000000000000&ui=00000000000000000000000000000000"

const nfc = new NFC(); // const nfc = new NFC(pretty); // optionally you can pass logger to see internal debug logs

var url_prefix = "not present";

const uuid = require('uuid');
const http = require('http');
const url = require('url');
var ntag = undefined;
var ntag_action = undefined;
var ntag_over = undefined;
var ntag_result = undefined;

//commands to support:
//check - this will check to see if a tag is present or not. a value of 0 indicates that there is a tag present, a value of 1 will indicate no tag is present.
//clear - this will clear whatever pending operation that might have been requested before.
//read - this will read a tag only.
//write - this will write to an empty or formatted tag.
//writeover/?ti= - this will be used for a specifc overwrite of an existing tag with existing data that has been previously read during write operation.
//writeover/?ti=AUTO - this will be used for bulk writing.

http.createServer(function (req, res) {
	var url_query = url.parse(req.url, true).query;

	if (req.url == "/check") {
		if (ntag == undefined) {
			res.write("1");
		} else {
			res.write("0");
		}
	}

	if (req.url == "/clear") {
		ntag_action = undefined;
		ntag_result = undefined;
		res.write("1");
	}

	if (req.url == "/pending") {
		if (ntag_action !== undefined) {
			if (ntag_result != "") {
				res.write(ntag_result);
				ntag_action = undefined;
				ntag_result = undefined;
			} else {
				res.write("1");
			}
		} else {
			res.write("0");
		}
	}

	if (req.url == "/read" || req.url == "/write") {
		if (ntag_action == undefined) {
			ntag_action = req.url;
			ntag_result = "";
			res.write("1");
			console.log("ntag_action = " + ntag_action);
		} else {
			res.write("0");
		}
	}

	if (req.url.startsWith("/writeover/") && url_query.ti !== undefined) {
		console.log(url_query.ti)
		if (ntag_action == undefined) {
			ntag_action = "/writeover";
			ntag_over = url_query.ti;
			ntag_result = "";
			res.write("1");
			console.log("ntag_action = " + ntag_action);
		} else {
			res.write("0");
		}
	}

	res.end();
}).listen(8080);

nfc.on('reader', async reader => {

	pretty.info(`device attached`, reader);

	reader.on('card', async card => {

		pretty.info(`detected item's UID: `, reader, card.uid);

		try {

			// match on the expected ATR for the NTAG213's & NTAG215's:
			if (JSON.stringify(ntag_atr) === JSON.stringify([...card.atr])) {
				// copy card object to global object ntag, for accessing from web server object
				ntag = card;

				var url_string = "";
				var current_tag = false
				var write_ready = false
				var data = await reader.read(4, 140);
				var start_byte = 0;
				var stop_byte = 0;

				// matching for a zeroed out or an empty tag
				if (data[5] === 0x00 || data[5] === 0x03) {
					console.log("Current NTAG is zeroed out or empty.")
					write_ready = true
					if (ntag_action == "/read") {
						ntag_result = ntag_action + " , " + "empty"
					}
				}

				// matching for a URL encoded tag
				if (data[5] === 0x55) {
					start_byte = 7;
					stop_byte = start_byte + data[4] - 1; //there is a trailing byte that we don't want, so we subtract 1 on the end to eliminate that noise.
					url_prefix = url_prefix_list[data[6]]

					var achar = ""
					url_string = "";
					for (var byte_loop=start_byte; byte_loop < stop_byte; byte_loop++) {
						achar = String.fromCharCode(data[byte_loop])
						url_string += achar;
					}

					//parsing the url from the tag to determine if ti and ui properties exist
					var url_query = url.parse(url_string, true).query;

					if (url_query.ti !== undefined && url_query.ui !== undefined) {
						// if (url_query.ti == card.uid && url_query.ui.length()==32) {
						if (url_query.ti.length == 14 && url_query.ui.length == 32) {
							current_tag = true
						}
					}

					pretty.info("The Current URL read is:", reader,  url_prefix + url_string)

					if (ntag_action == "/read") {
						ntag_result = ntag_action + " , " + url_prefix + url_string + " , " + card.uid
					}

				} else {
					url_prefix = "N/A";
					pretty.info("The item is not set up as a url link", reader)
				}

				if (ntag_action == "/writeover" && ntag_over !== undefined) {
					if (ntag_over == "AUTO" || ntag_over == card.uid) {write_ready = true}
				}

				if (ntag_action == "/write" || ntag_action == "/writeover") {

					console.log("writing to tag...")
					const uuid_buffer = Buffer.alloc(16);
					uuid.v4({}, uuid_buffer);
					url_string = "70.124.172.205:8200/ntag_check/?ti=" + card.uid + "&ui=" + uuid_buffer.toString('hex')

					if (write_ready) {
						data = Buffer.allocUnsafe(140).fill(0);
						data[0] = 0x03
						data[1] = url_string.length + 5;
						data[2] = 0xD1
						data[3] = 0x01
						data[4] = url_string.length + 1;
						data[5] = 0x55
						data[6] = 0x03
						data[url_string.length + 5 + 2] = 0xFE

						data.write(url_string, 7);
						await reader.write(4, data);

						var achar = ""
						url_string = "";
						for (var byte_loop=start_byte; byte_loop < stop_byte; byte_loop++) {
							achar = String.fromCharCode(data[byte_loop])
							url_string += achar;
						}

						pretty.info("The Current URL read is:", reader,  url_prefix + url_string)

						ntag_result = ntag_action + " , " +  url_prefix + url_string + " , " + card.uid

						console.log(ntag_result);

					} else {
						ntag_result = ntag_action + " , write requirements not met";
					}
				}
				
			} else {
				if (ntag_action !== undefined) {
					ntag_result = ntag_action + " , item not supported"
				}
				pretty.error("This item is not an expected NTAG213.", reader)
			}

		} catch (err) {
			if (ntag_action !== undefined) {
				ntag_result = ntag_action + " , error when reading item"
			}
			pretty.error(`error when reading item`, reader, err);
		}

	});

	reader.on('error', err => {
		pretty.error(`an error occurred`, reader, err);
	});

	reader.on('end', () => {
		pretty.info(`device removed`, reader);
	});

	reader.on('card.off', card => {
		url_prefix = "not present";
		url_string = "";
		ntag = undefined;
		pretty.info(`item removed `, reader);
	});
});

nfc.on('error', err => {
	pretty.error(`an error occurred`, err);
});
